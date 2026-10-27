<#macro icon provider>
    <#assign key = (provider.alias!'')?lower_case>
    <#assign label = (provider.displayName!'')?lower_case>
    <#if key?contains("google") || label?contains("google")>
        <svg class="ct-brand" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
    <#elseif key?contains("facebook") || label?contains("facebook")>
        <svg class="ct-brand" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="12" cy="12" r="12" fill="#1877F2"/>
            <path fill="#fff" d="M13.6 18.5v-5.1h1.72l.26-2h-1.98V10.1c0-.58.16-.97 1-.97h1.07V7.3c-.18-.02-.82-.08-1.56-.08-1.54 0-2.6.94-2.6 2.67v1.51H9.4v2h2.11v5.1h2.09z"/>
        </svg>
    <#else>
        <span class="ct-brand-fallback" aria-hidden="true">${(provider.displayName!'?')?substring(0,1)?upper_case}</span>
    </#if>
</#macro>

<#function buttonLabel action provider>
    <#assign lower = (provider.displayName!'')?lower_case>
    <#if lower?contains("google")>
        <#return action + " Google">
    <#elseif lower?contains("facebook")>
        <#return action + " Facebook">
    <#elseif lower?starts_with("sign ") || lower?starts_with("log")>
        <#return provider.displayName>
    <#else>
        <#return action + " " + (provider.displayName!'')>
    </#if>
</#function>

<#macro list action>
    <#if social?? && social.providers?? && social.providers?has_content>
        <div class="ct-social" id="kc-social-providers">
            <#list social.providers as p>
                <a data-once-link id="social-${p.alias}" class="ct-social-btn" href="${p.loginUrl}">
                    <@icon provider=p/>
                    <span>${buttonLabel(action, p)}</span>
                </a>
            </#list>
        </div>
        <div class="ct-or" role="separator"><span>OR</span></div>
    </#if>
</#macro>
