import '../styles/globals.css';
import Script from 'next/script';

export const metadata = {
  title: 'mvp_PRO - Async Daily Standup Assistant',
  description: 'AI-powered voice and text daily standups for remote engineering teams.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <Script
          id="posthog-js"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},p="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getActiveMatchingSurveys onSessionId".split(" "),r=0;r<p.length;r++)g(u,p[r]);e._i.push([i,s,a])},e.__SV=1.0,(o=t.createElement("script")).type="text/javascript",o.async=!0,o.src=s.api_host+"/static/array.js",(n=t.getElementsByTagName("script")[0]).parentNode.insertBefore(o,n))}(document,window.posthog||[]);
              posthog.init('phc_qyCbHftz42zxquAdbcaj9wjB4hRQBV4Xh9biRkFKNxrF', {
                api_host: 'https://us.i.posthog.com',
                person_profiles: 'identified_only',
                session_recording: {
                  maskAllInputs: false
                }
              });
            `,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
