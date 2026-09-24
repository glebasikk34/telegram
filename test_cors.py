import urllib.request, urllib.error
req = urllib.request.Request(
    'https://telegram-z0dj.onrender.com/tasks', 
    data=b'{"invalid": "data"}', 
    headers={'Origin': 'https://heroic-boba-c1e326.netlify.app', 'Content-Type': 'application/json'}
)
try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.headers)
