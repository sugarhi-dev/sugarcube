<#macro textField attribute placeholder="" icon="">
    <div class="ct-field">
        <label class="ct-label" for="${attribute.name}">${advancedMsg(attribute.displayName!'')}</label>
        <div class="ct-input<#if icon?has_content> ct-input-iconed</#if><#if messagesPerField.existsError(attribute.name)> is-invalid</#if>">
            <#if icon == "email">
                <svg class="ct-glyph" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
                    <path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                </svg>
            </#if>
            <input id="${attribute.name}" name="${attribute.name}" class="ct-control"
                   type="<#if attribute.name == 'email'>email<#else>text</#if>"
                   value="${(attribute.value!'')}"
                   <#if placeholder?has_content>placeholder="${placeholder}"</#if>
                   <#if attribute.readOnly>disabled</#if>
                   <#if attribute.autocomplete??>autocomplete="${attribute.autocomplete}"</#if>
                   <#if attribute.annotations?? && attribute.annotations.inputTypePattern??>pattern="${attribute.annotations.inputTypePattern}"</#if>
                   <#if attribute.annotations?? && attribute.annotations.inputTypeMaxlength??>maxlength="${attribute.annotations.inputTypeMaxlength}"</#if>
                   aria-invalid="<#if messagesPerField.existsError(attribute.name)>true</#if>"
                   dir="ltr"/>
        </div>
        <#if messagesPerField.existsError(attribute.name)>
            <div id="input-error-${attribute.name}" class="ct-error" aria-live="polite">${kcSanitize(messagesPerField.get(attribute.name))?no_esc}</div>
        </#if>
    </div>
</#macro>
