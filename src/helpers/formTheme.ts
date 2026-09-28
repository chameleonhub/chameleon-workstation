import { useEffect, useState } from 'react';

export type FormTheme = 'kobo' | 'grid';

// Each theme is a complete, standalone Enketo stylesheet, so - as in Enketo Express - only the theme of the
// form on screen is loaded, and it is removed again when the form goes away. The stylesheets are separate
// lazy chunks (`?inline` = the compiled CSS as a string) rather than part of the app's global CSS.
const loaders: Record<FormTheme, () => Promise<{ default: string }>> = {
    kobo: () => import('../assets/styles/kobo.scss?inline'),
    grid: () => import('../assets/styles/grid.scss?inline'),
};

/**
 * Which theme a form wants. XLSForm's `style` setting ends up as a class on <h:body>; the form-transformer
 * would happily overwrite it with whatever theme it is told to use, so read it from the XForm first.
 */
export const detectFormTheme = (formXML: string): FormTheme =>
    /<(?:[a-z]+:)?body[^>]*class="[^"]*theme-grid/i.test(formXML) ? 'grid' : 'kobo';

/**
 * Loads `theme` for as long as the calling component is mounted. Returns true once it is in the page, so the
 * form can wait for it and never render unstyled.
 */
export const useFormTheme = (theme: FormTheme): boolean => {
    const [loadedTheme, setLoadedTheme] = useState<FormTheme | null>(null);

    useEffect(() => {
        let cancelled = false;
        let style: HTMLStyleElement | undefined;

        loaders[theme]().then((module) => {
            if (cancelled) return;
            style = document.createElement('style');
            style.dataset.formTheme = theme;
            style.textContent = module.default;
            // First in <head>, i.e. before the app's own CSS - the position the Kobo theme always had when it
            // was bundled ahead of the base reset and App.scss.
            document.head.prepend(style);
            setLoadedTheme(theme);
        });

        return () => {
            cancelled = true;
            style?.remove();
        };
    }, [theme]);

    return loadedTheme === theme;
};
