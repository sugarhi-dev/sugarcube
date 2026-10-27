<#import "template.ftl" as layout>
<#import "social.ftl" as idp>
<#import "fields.ftl" as fields>
<#import "user-profile-commons.ftl" as userProfileCommons>
<#import "register-commons.ftl" as registerCommons>
<@layout.registrationLayout displayMessage=messagesPerField.exists('global') displayRequiredFields=false displayInfo=false; section>
    <#if section = "header">
        <h1 class="ct-title">Create your account</h1>
        <p class="ct-sub">Already have an account? <a href="${url.loginUrl}">Log in</a></p>
    <#elseif section = "socialProviders">
        <@idp.list action="Sign up with"/>
    <#elseif section = "form">
        <form id="kc-register-form" class="ct-form" action="${url.registrationAction}" method="post">
            <#assign hasFirst = false>
            <#assign hasLast = false>
            <#list profile.attributes as attribute>
                <#if attribute.name == "firstName"><#assign hasFirst = true></#if>
                <#if attribute.name == "lastName"><#assign hasLast = true></#if>
                <#if attribute.name == "locale" && realm.internationalizationEnabled && locale.currentLanguageTag?has_content>
                    <input type="hidden" id="locale" name="locale" value="${locale.currentLanguageTag}"/>
                </#if>
            </#list>

            <#if hasFirst || hasLast>
                <div class="<#if hasFirst && hasLast>ct-name-row<#else>ct-stack</#if>">
                    <#list profile.attributes as attribute>
                        <#if attribute.name == "firstName" || attribute.name == "lastName">
                            <@fields.textField attribute=attribute placeholder=(attribute.name == "firstName")?then("Jake", "Banks")/>
                        </#if>
                    </#list>
                </div>
            </#if>

            <#list profile.attributes as attribute>
                <#if attribute.name == "email">
                    <@fields.textField attribute=attribute placeholder="you@production.com" icon="email"/>
                </#if>
            </#list>

            <#list profile.attributes as attribute>
                <#if attribute.name == "username" && !realm.registrationEmailAsUsername>
                    <@fields.textField attribute=attribute/>
                </#if>
            </#list>

            <#if passwordRequired??>
                <div class="ct-field">
                    <label class="ct-label" for="password">${msg("password")}</label>
                    <div class="ct-input ct-input-iconed<#if messagesPerField.existsError('password','password-confirm')> is-invalid</#if>">
                        <svg class="ct-glyph" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
                            <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                        </svg>
                        <input type="password" id="password" class="ct-control" name="password" autocomplete="new-password"
                               placeholder="At least 8 characters"
                               aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"/>
                    </div>
                    <input type="hidden" id="password-confirm" name="password-confirm" value=""/>
                    <#if messagesPerField.existsError('password')>
                        <div id="input-error-password" class="ct-error" aria-live="polite">${kcSanitize(messagesPerField.get('password'))?no_esc}</div>
                    </#if>
                    <#if messagesPerField.existsError('password-confirm')>
                        <div id="input-error-password-confirm" class="ct-error" aria-live="polite">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</div>
                    </#if>
                </div>
            </#if>

            <#list profile.attributes as attribute>
                <#if attribute.name != "locale" && attribute.name != "firstName" && attribute.name != "lastName" && attribute.name != "email" && attribute.name != "username">
                    <div class="ct-field">
                        <label class="ct-label" for="${attribute.name}">${advancedMsg(attribute.displayName!'')}</label>
                        <@userProfileCommons.inputFieldByType attribute=attribute/>
                        <#if messagesPerField.existsError(attribute.name)>
                            <div id="input-error-${attribute.name}" class="ct-error" aria-live="polite">${kcSanitize(messagesPerField.get(attribute.name))?no_esc}</div>
                        </#if>
                    </div>
                </#if>
            </#list>

            <@registerCommons.termsAcceptance/>

            <#if recaptchaRequired?? && (recaptchaVisible!false)>
                <div class="ct-field">
                    <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}" data-action="${recaptchaAction}"></div>
                </div>
            </#if>

            <#if recaptchaRequired?? && !(recaptchaVisible!false)>
                <script>
                    function onSubmitRecaptcha(token) {
                        document.getElementById("kc-register-form").requestSubmit();
                    }
                </script>
                <button class="ct-submit g-recaptcha" data-sitekey="${recaptchaSiteKey}" data-callback="onSubmitRecaptcha" data-action="${recaptchaAction}" type="submit">
                    Create account <span aria-hidden="true">→</span>
                </button>
            <#else>
                <button class="ct-submit" type="submit">Create account <span aria-hidden="true">→</span></button>
            </#if>

            <p class="ct-legal">By continuing you agree to CopyThat's <a href="#">Terms of Service</a> and acknowledge our <a href="#">Privacy Policy</a>.</p>
        </form>
        <#if passwordRequired??>
            <script>
                (function () {
                    var password = document.getElementById("password");
                    var confirm = document.getElementById("password-confirm");
                    if (!password || !confirm) return;
                    var sync = function () { confirm.value = password.value; };
                    password.addEventListener("input", sync);
                    password.form.addEventListener("submit", sync);
                })();
            </script>
        </#if>
    </#if>
</@layout.registrationLayout>
