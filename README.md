# Translator
This tool aims at auto-translating the strings res (`strings.xml` for Android, `strings.local` for iOS).


## Prepare
* NodeJS
* Python3
```
pip3 install PyExecJS 
pip3 install requests
```

## HowTo
1. Run `npm start ./res/strings.xml en zh ./out`
2. Output files located at `./out/strings-zh.xml`
