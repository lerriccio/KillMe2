package it.lerriccio.killme2;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowInsets;
import android.webkit.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

/** Offline shell with a private HTTPS origin. External sites never enter the game WebView. */
public final class MainActivity extends Activity {
    private static final String HOST="app.killme2.local", START="https://"+HOST+"/index.html";
    private static final int IMPORT=11, EXPORT=12;
    private WebView game;
    private android.webkit.ValueCallback<Uri[]> fileCallback;
    private String pendingExport;
    private boolean ready;

    // JavaScript is the game engine; only bundled assets from the private origin can load.
    @android.annotation.SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        game=new WebView(this);game.setBackgroundColor(Color.rgb(16,20,38));setContentView(game);
        // API 35+ enforces edge-to-edge. Pad the content so controls stay clear of bars/cutouts.
        game.setOnApplyWindowInsetsListener((v,insets)->{
            if(android.os.Build.VERSION.SDK_INT>=30){android.graphics.Insets b=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());v.setPadding(b.left,b.top,b.right,b.bottom);}
            else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        WebSettings s=game.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);s.setAllowContentAccess(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(true);s.setSupportMultipleWindows(false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        game.addJavascriptInterface(new ExportBridge(),"AndroidHost");
        game.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();if(isLocal(uri))return false;
                if("https".equals(uri.getScheme())){try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ignored){}}
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();if(!isLocal(uri))return response(403,"Forbidden",new byte[0],"text/plain");
                String path=uri.getPath();if(path==null||path.contains("..")||path.indexOf('\\')>=0)return response(403,"Forbidden",new byte[0],"text/plain");
                try(InputStream in=getAssets().open("game"+path)) {return response(200,"OK",read(in),mime(path));}
                catch(IOException e){return response(404,"Not Found",new byte[0],"text/plain");}
            }
            @Override public void onPageFinished(WebView v,String url){ready=true;}
            @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())runOnUiThread(()->new AlertDialog.Builder(MainActivity.this).setMessage("Unable to load the game / Impossibile caricare il gioco").setPositiveButton("Retry / Riprova",(d,w)->game.loadUrl(START)).setNegativeButton("Exit / Esci",(d,w)->finish()).show());}
            @Override public boolean onRenderProcessGone(WebView v,RenderProcessGoneDetail detail){ready=false;v.destroy();recreate();return true;}
        });
        game.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView v,android.webkit.ValueCallback<Uri[]> callback,FileChooserParams p){
                if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
                Intent i=new Intent(Intent.ACTION_GET_CONTENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE);
                try{startActivityForResult(i,IMPORT);}catch(Exception e){callback.onReceiveValue(null);fileCallback=null;}return true;
            }
        });
        game.loadUrl(START);
        if(android.os.Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
    }
    private static boolean isLocal(Uri u){return "https".equals(u.getScheme())&&HOST.equals(u.getHost())&&(u.getPort()==-1||u.getPort()==443);}
    private static WebResourceResponse response(int status,String reason,byte[] bytes,String mime){java.util.HashMap<String,String> headers=new java.util.HashMap<>();headers.put("Cache-Control","no-cache");headers.put("X-Content-Type-Options","nosniff");return new WebResourceResponse(mime,mime.startsWith("text/")||mime.contains("javascript")?"UTF-8":null,status,reason,headers,new ByteArrayInputStream(bytes));}
    private static byte[] read(InputStream in)throws IOException{ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[16384];int n;while((n=in.read(b))!=-1)out.write(b,0,n);return out.toByteArray();}
    private static String mime(String p){if(p.endsWith(".html"))return "text/html";if(p.endsWith(".js"))return "application/javascript";if(p.endsWith(".css"))return "text/css";if(p.endsWith(".png"))return "image/png";if(p.endsWith(".mp3"))return "audio/mpeg";if(p.endsWith(".ogg"))return "audio/ogg";if(p.endsWith(".ttf"))return "font/ttf";return "application/octet-stream";}
    public final class ExportBridge {
        @JavascriptInterface public void exportProgress(String json){if(json==null||json.length()>5000000)return;runOnUiThread(()->{pendingExport=json;try{startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,"killme2-progress.json"),EXPORT);}catch(Exception e){pendingExport=null;}});}
    }
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);
        if(request==IMPORT&&fileCallback!=null){Uri chosen=result==RESULT_OK&&data!=null?data.getData():null;fileCallback.onReceiveValue(chosen!=null&&"content".equals(chosen.getScheme())?new Uri[]{chosen}:null);fileCallback=null;}
        if(request==EXPORT&&pendingExport!=null){if(result==RESULT_OK&&data!=null)try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(pendingExport.getBytes(StandardCharsets.UTF_8));}catch(Exception e){new AlertDialog.Builder(this).setMessage("Export failed / Esportazione non riuscita").setPositiveButton("OK",null).show();}pendingExport=null;}
    }
    // API 33+ uses the OnBackInvokedDispatcher registered in onCreate; this is the API 26–32 fallback.
    @android.annotation.SuppressLint("GestureBackNavigation")
    @Override public void onBackPressed(){handleBack();}
    private void handleBack(){if(!ready){finish();return;}game.evaluateJavascript("window.KillMe2?window.KillMe2.back():false",result->{if("false".equals(result)||"null".equals(result))new AlertDialog.Builder(this).setMessage("Exit game? / Uscire dal gioco?").setPositiveButton("Exit / Esci",(d,w)->finish()).setNegativeButton("Cancel / Annulla",null).show();});}
    @Override protected void onPause(){if(game!=null){game.evaluateJavascript("window.KillMe2?.suspend()",null);game.onPause();}super.onPause();}
    @Override protected void onResume(){super.onResume();if(game!=null){game.onResume();if(ready)game.evaluateJavascript("window.KillMe2?.resumeAudio()",null);}}
    @Override protected void onDestroy(){if(fileCallback!=null)fileCallback.onReceiveValue(null);if(game!=null){game.removeJavascriptInterface("AndroidHost");game.destroy();}super.onDestroy();}
}
