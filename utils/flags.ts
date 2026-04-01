const FLAG_MAP: { [key: string]: string } = {
  'ar': 'flag:sa-1x1', 'bg': 'flag:bg-1x1', 'bn': 'flag:bd-1x1',
  'ca': 'flag:es-ct-1x1', 'cs': 'flag:cz-1x1', 'cy': 'flag:gb-wls-1x1',
  'da': 'flag:dk-1x1', 'de': 'flag:de-1x1', 'el': 'flag:gr-1x1',
  'en': 'flag:us-1x1', 'es': 'flag:es-1x1', 'et': 'flag:ee-1x1',
  'eu': 'flag:es-pv-1x1', 'fa': 'flag:ir-1x1', 'fi': 'flag:fi-1x1',
  'fr': 'flag:fr-1x1', 'ga': 'flag:ie-1x1', 'gu': 'flag:in-1x1',
  'he': 'flag:il-1x1', 'hi': 'flag:in-1x1', 'hr': 'flag:hr-1x1',
  'hu': 'flag:hu-1x1', 'id': 'flag:id-1x1', 'is': 'flag:is-1x1',
  'it': 'flag:it-1x1', 'ja': 'flag:jp-1x1', 'ko': 'flag:kr-1x1',
  'lt': 'flag:lt-1x1', 'lv': 'flag:lv-1x1', 'mk': 'flag:mk-1x1',
  'ml': 'flag:in-1x1', 'mr': 'flag:in-1x1', 'mt': 'flag:mt-1x1',
  'nl': 'flag:nl-1x1', 'no': 'flag:no-1x1', 'pl': 'flag:pl-1x1',
  'pt': 'flag:pt-1x1', 'ro': 'flag:ro-1x1', 'ru': 'flag:ru-1x1',
  'sk': 'flag:sk-1x1', 'sl': 'flag:si-1x1', 'sv': 'flag:se-1x1',
  'ta': 'flag:in-1x1', 'te': 'flag:in-1x1', 'th': 'flag:th-1x1',
  'tr': 'flag:tr-1x1', 'uk': 'flag:ua-1x1', 'ur': 'flag:pk-1x1',
  'vi': 'flag:vn-1x1', 'zh': 'flag:cn-1x1'
}

export function getFlagIcon(languageCode: string): string {
  return FLAG_MAP[languageCode] || 'flag:us-1x1'
}
