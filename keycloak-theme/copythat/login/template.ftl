<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html class="ct-html" lang="${lang}"<#if realm.internationalizationEnabled> dir="${(locale.rtl)?then('rtl','ltr')}"</#if>>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <script type="importmap">
        {
            "imports": {
                "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
            }
        }
    </script>
    <script type="module">
        import { startSessionPolling } from "${url.resourcesPath}/js/authChecker.js";

        startSessionPolling("${url.ssoLoginInOtherTabsUrl?no_esc}");
    </script>
    <script type="module">
        document.addEventListener("click", (event) => {
            const link = event.target.closest("a[data-once-link]");
            if (!link) {
                return;
            }
            if (link.getAttribute("aria-disabled") === "true") {
                event.preventDefault();
                return;
            }
            link.setAttribute("aria-disabled", "true");
        });
    </script>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <#if authenticationSession??>
        <script type="module">
            import { checkAuthSession } from "${url.resourcesPath}/js/authChecker.js";
            checkAuthSession("${authenticationSession.authSessionIdHash}");
        </script>
    </#if>
</head>
<body class="ct-body ${bodyClass}" data-page-id="login-${pageId}">
    <div class="ct-canvas">
        <div class="ct-photo">
            <div class="ct-card">
                <#assign closeHref = (client?? && client.baseUrl?has_content)?then(client.baseUrl, "")>
                <#if closeHref?has_content>
                    <a class="ct-close" href="${closeHref}" aria-label="Close">
                <#else>
                    <a class="ct-close" href="#" aria-label="Close" onclick="history.back(); return false;">
                </#if>
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                    </svg>
                </a>

                <div class="ct-logo" aria-label="CopyThat">COPY<span>THAT</span></div>

                <#if !(auth?has_content && auth.showUsername() && !auth.showResetCredentials())>
                    <div class="ct-header" id="kc-page-title"><#nested "header"></div>
                <#else>
                    <#nested "show-username">
                    <div class="ct-attempted" id="kc-username">
                        <span>${auth.attemptedUsername}</span>
                        <a id="reset-login" href="${url.loginRestartFlowUrl}">${msg("restartLoginTooltip")}</a>
                    </div>
                </#if>

                <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                    <div class="ct-alert ct-alert-${message.type}" role="alert">
                        <span>${kcSanitize(message.summary)?no_esc}</span>
                    </div>
                </#if>

                <#nested "socialProviders">
                <#nested "form">

                <#if auth?has_content && auth.showTryAnotherWayLink()>
                    <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post" class="ct-try-another">
                        <input type="hidden" name="tryAnotherWay" value="on"/>
                        <a href="#" id="try-another-way" onclick="document.forms['kc-select-try-another-way-form'].requestSubmit();return false;">${msg("doTryAnotherWay")}</a>
                    </form>
                </#if>

                <#if displayInfo>
                    <div id="kc-info" class="ct-info"><#nested "info"></div>
                </#if>

                <#if realm.internationalizationEnabled && locale.supported?size gt 1>
                    <div class="ct-locale" id="kc-locale">
                        <#list locale.supported as l>
                            <a href="${l.url}"<#if locale.current == l.label> aria-current="true"</#if>>${l.label}</a>
                        </#list>
                    </div>
                </#if>
            </div>
        </div>
    </div>
</body>
</html>
</#macro>
