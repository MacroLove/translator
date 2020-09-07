var FS = require('fs');
var HTTP = require('request');
const { execSync } = require('child_process');
const ReadLine = require('readline');
const { resolve } = require('path');
Promise.allSettled = require('promise.allsettled');

let args = process.argv.splice(2);
console.log('所传递的参数是：', args);
if (args.length < 5) {
  console.log('参数不够！');
  return;
}
let file_path = args[0] || 'res/strings.xml';
let src_lang = args[1] || 'en';
let to_lang = args[2] || 'zh';
let out_dir = args[3] || './out';
let type = args[4] || 'android'

// Prepare out dirs
FS.mkdirSync(out_dir + "/tmp", { recursive: true })

// -------------------------------- Start
// translate('我是他吗', 'res/test', 'zh', 'en')
if (type == 'android') {
  startAndroid(file_path, src_lang, to_lang, out_dir)
} else {
  startIOS(file_path, src_lang, to_lang, out_dir)
}

function startAndroid(file_path, src_lang, to_lang, out_dir) {
  let contents = FS.readFileSync(file_path, {encoding: 'utf-8'});
  let arr = contents.split('</string>')
  let specials = ''
  let promises = []
  let keys = []

  for (let i=0; i<arr.length; ++i) {
    let s = arr[i]
    s = s.trim().replace(/\n/g, '')
    if (s.length >= 1) {
      let m = s.match(/<string\s+name=\"(.*)\">([\s\S]*)/)
      if (!m || !m[1] || !m[2]) continue
      if (m[2].indexOf("%s") != -1) {
        console.log(`${m[1]} ====> ${m[2]}`)
        specials += `${m[1]} ====> ${m[2]}\n`
        m[2] = m[2].replace(/\%s/g, '')
      }

      // translate
      let tmp = out_dir + '/tmp/-' + guid()
      keys.push(m[1])
      promises.push(translate(m[2], tmp, src_lang, to_lang))
    }
  }
  FS.writeFileSync(`${out_dir}/specials-android.txt`, specials, {encoding: 'utf-8'})
  Promise.allSettled(promises).then((rets) => {
    let str = ''
    for (let i=0; i < rets.length; ++i) {
      if (rets[i].value) {
        str += `<string name="${keys[i]}">${rets[i].value}</string>` + "\n"
      }
    }
    let to = `${out_dir}/strings-${to_lang}.xml`
    FS.writeFileSync(to, str, {encoding: 'utf-8'})
    console.log("All items are translated!")
    console.log("Saved to: " + to)
  });
}

function startIOS(file_path, src_lang, to_lang, out_dir) {
  readLinsOfFile(file_path).then((lines) => {
    let specials = ''
    let promises = []
    let keys = []
    for (let l of lines) {
      if (l.indexOf("\" = \"") != -1) {
        let arr = l.split('" = "')
        keys.push(arr[0] + '"')
        let value = trim(arr[1], ';').trim(arr[1], '"')
        if (value.indexOf("%@") != -1 || value.indexOf("$@") != -1) {
          specials += l
          value = value.replace(/\%@|\$@/g, '')
        }
        // translate
        let tmp = out_dir + '/tmp/-' + guid()
        promises.push(translate(value, tmp, src_lang, to_lang))
      }
    }
  });
  FS.writeFileSync(`${out_dir}/specials-ios.txt`, specials, {encoding: 'utf-8'})
  Promise.allSettled(promises).then((rets) => {
    let str = ''
    for (let i=0; i < rets.length; ++i) {
      if (rets[i].value) {
        str += `${keys[i]} = \"${rets[i].value}\";` + "\n"
      }
    }
    let to = `${out_dir}/ios-${to_lang}.strings`
    FS.writeFileSync(to, str, {encoding: 'utf-8'})
    console.log("All items are translated!")
    console.log("Saved to: " + to)
  });
}

function trim(s, c) {
  if (c === "]") c = "\\]";
  if (c === "\\") c = "\\\\";
  return s.replace(new RegExp(
    "^[" + c + "]+|[" + c + "]+$", "g"
  ), "");
}

function readLinsOfFile(file_path) {
  return new Promise((resolve, reject) => {
    let lines = []
    const readInterface = ReadLine.createInterface({
      input: FS.createReadStream(file_path)
    });
    readInterface.on('line', function(line) {
      lines.push(line);
    });
    readInterface.on('close', function() {
      resolve(lines);
    })
  });
}
function translate(value, filepath, src_lang, to_lang) {
  new Promise((resolve, reject) => {
    FS.writeFileSync(filepath, value, {encoding: 'utf-8'})
    execSync(`python index.py ${filepath} ${src_lang} ${to_lang}`)
    value = FS.readFileSync(filepath, {encoding: 'utf-8'})
    console.debug(value)
    FS.unlinkSync(filepath)
    resolve(value)
  });
}

/**
 * Generates a GUID string.
 * @returns {string} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser.
 * @link http://slavik.meltser.info/?p=142
 */
function guid() {
    function _p8(s) {
        var p = (Math.random().toString(16)+"000000000").substr(2,8);
        return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
    }
    return _p8() + _p8(true) + _p8(true) + _p8();
}

//
// function translate(str) {
  // let url = 'https://fanyi.baidu.com/v2transapi?from=en&to=zh'
//   HTTP({
//     url: url,
//     method: "POST",
//     headers: {
//       'accept': '*/*',
//       'accept-encoding': 'deflate',
//       'accept-language': 'ja,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7,zh;q=0.6',
//       'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
//       'cookie': 'BIDUPSID=DB99274957909A4300FC9DF36B0A9919; PSTM=1586827925; BAIDUID=DB99274957909A43916D4B9B6E89CC43:FG=1; REALTIME_TRANS_SWITCH=1; FANYI_WORD_SWITCH=1; HISTORY_SWITCH=1; SOUND_SPD_SWITCH=1; SOUND_PREFER_SWITCH=1; BDORZ=B490B5EBF6F3CD402E515D22BCDA1598; H_PS_PSSID=32606_1436_32621_31660_32046_32677_32115_26350; delPer=0; PSINO=2; Hm_lpvt_64ecd82404c51e03dc91cb9e8c025574=1599140189; Hm_lvt_64ecd82404c51e03dc91cb9e8c025574=1599018810,1599025735,1599095991,1599140189; __yjsv5_shitong=1.0_7_7b96a0d26fbf6d2901d4466152b1b30769c6_300_1599140189636_119.109.111.221_46a5625b; yjs_js_security_passport=8927a8d3785f8638c95c82bf01deea60adc1b6a9_1599140190_js; _ga=GA1.2.2865840.1599140195; _gid=GA1.2.272166238.1599140195',
//       'origin': 'https://fanyi.baidu.com',
//       'referer': 'https://fanyi.baidu.com/translate?aldtype=16047&query=&keyfrom=baidu&smartresult=dict&lang=auto2zh',
//       'sec-fetch-dest': 'empty',
//       'sec-fetch-mode': 'cors',
//       'sec-fetch-site': 'same-origin',
//       'user-agent':' Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36',
//       'x-requested-with': 'XMLHttpRequest'
//     },
//     form: {
//       from: 'en',
//       to: 'zh',
//       query: str,
//       transtype: 'translang',
//       simple_means_flag: '3',
//       sign: '881271.627014',
//       token: '2d3702a3f32e257ad49c04f796404650',
//       domain: 'common'
//     }
//   }, function(error, response, body) {
//     console.log(error || response.statusCode)
//       if (!error && response.statusCode == 200) {
//         console.log(body)
//       }
//   }); 
// }

// translate('this is a game')