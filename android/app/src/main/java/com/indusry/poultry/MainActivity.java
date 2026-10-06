package com.indusry.poultry;

import android.graphics.Rect;
import android.os.Bundle;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final WebView webView = getBridge().getWebView();
        final View rootView = webView.getRootView();
        final float density = getResources().getDisplayMetrics().density;
        final int extraMarginDp = 4;

        rootView.getViewTreeObserver().addOnGlobalLayoutListener(new ViewTreeObserver.OnGlobalLayoutListener() {
            private int lastHeightPx = -1;

            @Override
            public void onGlobalLayout() {
                Rect r = new Rect();
                rootView.getWindowVisibleDisplayFrame(r);
                int screenHeight = rootView.getHeight();
                int visibleHeight = r.bottom - r.top;
                int keyboardHeightPx = screenHeight - visibleHeight;
                if (keyboardHeightPx < 0) keyboardHeightPx = 0;

                if (keyboardHeightPx != lastHeightPx) {
                    lastHeightPx = keyboardHeightPx;
                    boolean isOpen = keyboardHeightPx > screenHeight * 0.15;
                    int keyboardHeightDp = isOpen
                            ? Math.round(keyboardHeightPx / density) + extraMarginDp
                            : 0;

                    String js = "document.documentElement.style.setProperty('--keyboard-height','" + keyboardHeightDp + "px');"
                            + "document.body.classList.toggle('keyboard-open', " + isOpen + ");";

                    webView.post(() -> {
                        webView.evaluateJavascript(js, null);
                        webView.setTranslationY(0.1f);
                        webView.post(() -> webView.setTranslationY(0f));
                    });
                }
            }
        });

        webView.getViewTreeObserver().addOnGlobalFocusChangeListener((View oldFocus, View newFocus) -> {
            if (newFocus != null) {
                InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
                if (imm != null) {
                    imm.showSoftInput(webView, InputMethodManager.SHOW_IMPLICIT);
                }
            }
        });
    }
}
