<#import "template.ftl" as layout>
<#import "social.ftl" as idp>
<#import "passkeys.ftl" as passkeys>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=false; section>
    <#if section = "header">
        <h1 class="ct-title">${msg("loginAccountTitle")}</h1>
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <p class="ct-sub">Don't have an account? <a href="${url.registrationUrl}">Sign up</a></p>
        </#if>
    <#elseif section = "socialProviders">
        <#if realm.password>
            <@idp.list action="Sign in with"/>
        </#if>
    <#elseif section = "form">
        <#if realm.password>
            <form id="kc-form-login" class="ct-form" action="${url.loginAction}" method="post" onsubmit="this.login.disabled = true; return true;">
                <#if !usernameHidden??>
                    <#assign usernameLabel>
                        <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                    </#assign>
                    <#assign emailLogin = realm.loginWithEmailAllowed && realm.registrationEmailAsUsername>
                    <div class="ct-field">
                        <label class="ct-label" for="username">${usernameLabel}</label>
                        <div class="ct-input<#if emailLogin> ct-input-iconed</#if><#if messagesPerField.existsError('username','password')> is-invalid</#if>">
                            <#if emailLogin>
                                <svg class="ct-glyph" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                                    <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
                                    <path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                                </svg>
                            </#if>
                            <input tabindex="1" id="username" class="ct-control" name="username" value="${(login.username!'')}" type="text"
                                   placeholder="<#if emailLogin>you@production.com</#if>"
                                   autofocus autocomplete="${(enableWebAuthnConditionalUI?has_content)?then('username webauthn', 'username')}"
                                   aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                                   dir="ltr"/>
                        </div>
                    </div>
                </#if>

                <div class="ct-field">
                    <div class="ct-label-row">
                        <label class="ct-label" for="password">${msg("password")}</label>
                        <#if realm.resetPasswordAllowed>
                            <a class="ct-forgot" tabindex="3" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
                        </#if>
                    </div>
                    <div class="ct-input ct-input-iconed<#if messagesPerField.existsError('username','password')> is-invalid</#if>">
                        <svg class="ct-glyph" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
                            <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                        </svg>
                        <input tabindex="2" id="password" class="ct-control" name="password" type="password" autocomplete="current-password"
                               placeholder="At least 8 characters"
                               aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                               <#if usernameHidden??>autofocus</#if>/>
                    </div>
                    <#if messagesPerField.existsError('username','password')>
                        <div id="input-error" class="ct-error" aria-live="polite">${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}</div>
                    </#if>
                </div>

                <#if realm.rememberMe && !usernameHidden??>
                    <label class="ct-check">
                        <#if login.rememberMe??>
                            <input tabindex="4" id="rememberMe" name="rememberMe" type="checkbox" checked>
                        <#else>
                            <input tabindex="4" id="rememberMe" name="rememberMe" type="checkbox">
                        </#if>
                        <span>${msg("rememberMe")}</span>
                    </label>
                </#if>

                <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                <button tabindex="5" class="ct-submit" name="login" id="kc-login" type="submit">${msg("doLogIn")} <span aria-hidden="true">→</span></button>
            </form>
        </#if>
        <@passkeys.conditionalUIData />
    </#if>
</@layout.registrationLayout>
