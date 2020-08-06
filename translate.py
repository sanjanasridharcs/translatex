from googletrans import Translator

translator = Translator(service_urls=['translate.google.com'])
text = translator.translate('你好！你好吗').text
print(text)