import json
import urllib.request

proxy = 'https://api.allorigins.win/raw?url='
url = 'https://wic.gov.taipei/OpenData/API/Rain/Get?stationNo=&loginId=open_rain&dataKey=85452C1D'
full = proxy + urllib.request.quote(url, safe=':/?=;&')
print('request:', full)

with urllib.request.urlopen(full, timeout=10) as r:
    text = r.read().decode('utf-8')
    data = json.loads(text)
    print('top keys:', list(data.keys()))
    print('data type', type(data.get('data')))
    if isinstance(data.get('data'), list):
        print('len data', len(data['data']))
        print('first keys', list(data['data'][0].keys()))
        print('first sample', data['data'][0])
