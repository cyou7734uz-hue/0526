import urllib.request, json
url='https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0002-001?Authorization=rdec-key-123-45678-011121314'
raw=urllib.request.urlopen(url, timeout=30).read().decode('utf-8')
obj=json.loads(raw)
stations=obj['result']['records']['Station']
count=0
for s in stations:
    if s['GeoInfo']['CountyName'] == '»O¥_¥«':
        count += 1
        if count <= 20:
            print(s['StationName'], s['StationId'], s['GeoInfo']['StationLatitude'], s['GeoInfo']['StationLongitude'], s['GeoInfo']['TownName'])
print('Taipei count', count)
