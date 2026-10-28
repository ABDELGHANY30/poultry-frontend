package com.indusry.poultry;

import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        final WebView webView = getBridge().getWebView();
        final View rootView = webView.getRootView();
        final float density = getResources().getDisplayMetrics().density;
        final int extraMarginDp = 4;

        webView.getViewTreeObserver().addOnGlobalFocusChangeListener((View oldFocus, View newFocus) -> {
            if (newFocus != null) {
                InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
                if (imm != null) {
                    imm.showSoftInput(webView, InputMethodManager.SHOW_IMPLICIT);
                }
            }
        });

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
                int imeHeightPx = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom;
                int statusBarPx = insets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
                int navBarPx = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;

                // نثبت مساحة شريط الحالة فوق وشريط التنقل تحت دايمًا
                v.setPadding(0, statusBarPx, 0, navBarPx);

                int realKeyboardPx = imeHeightPx - navBarPx;
                if (realKeyboardPx < 0) realKeyboardPx = 0;

                boolean isOpen = realKeyboardPx > 0;
                int keyboardHeightDp = isOpen
                        ? Math.round(realKeyboardPx / density) + extraMarginDp
                        : 0;
                applyKeyboardHeight(webView, keyboardHeightDp, isOpen);
                return insets;
            });
        } else {
            rootView.getViewTreeObserver().addOnGlobalLayoutListener(new ViewTreeObserver.OnGlobalLayoutListener() {
                private int baselineDiffPx = -1;
                private int lastHeightPx = -1;

                @Override
                public void onGlobalLayout() {
                    Rect r = new Rect();
                    rootView.getWindowVisibleDisplayFrame(r);
                    int screenHeight = rootView.getHeight();
                    int visibleHeight = r.bottom - r.top;
                    int rawDiffPx = screenHeight - visibleHeight;

                    if (baselineDiffPx == -1) {
                        baselineDiffPx = rawDiffPx;
                        return;
                    }
                    if (rawDiffPx < baselineDiffPx) {
                        baselineDiffPx = rawDiffPx;
                    }

                    int keyboardHeightPx = rawDiffPx - baselineDiffPx;
                    if (keyboardHeightPx < 0) keyboardHeightPx = 0;

                    if (keyboardHeightPx != lastHeightPx) {
                        lastHeightPx = keyboardHeightPx;
                        int screenPortion = screenHeight / 7;
                        boolean isOpen = keyboardHeightPx > screenPortion;
                        int keyboardHeightDp = isOpen
                                ? Math.round(keyboardHeightPx / density) + extraMarginDp
                                : 0;
                        applyKeyboardHeight(webView, keyboardHeightDp, isOpen);
                    }
                }
            });
        }
    }
    private void applyKeyboardHeight(WebView webView, int keyboardHeightDp, boolean isOpen) {
        String js = "document.documentElement.style.setProperty('--keyboard-height','" + keyboardHeightDp + "px');"
                + "document.body.classList.toggle('keyboard-open', " + isOpen + ");";
        webView.post(() -> {
            webView.evaluateJavascript(js, null);
            webView.setTranslationY(0.1f);
            webView.post(() -> webView.setTranslationY(0f));
        });
    }
}