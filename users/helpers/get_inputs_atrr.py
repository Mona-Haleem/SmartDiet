def get_inputs_attr(refs, key, mapping, err_msg):
    return { 
        '@focus': f'removeError({refs}.{key}.closest("p").nextElementSibling)',
        '@blur': f'validateInput({refs}.{key}, "{err_msg}", {refs}.{key}.closest("p").nextElementSibling)',
        'x-ref': key,
        'x-init': f'{mapping}.{key} = {refs}.{key}',

    }
