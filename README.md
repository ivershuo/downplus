已提供的插件消息通讯接口
========
插件id：`pmlnbkoiiamffenppfmjgfggfhgnlcac`

##消息格式：
```
{
    method : <string>,
    data   : <object>
}
```

### method : 'down'
示例：
```javascript
chrome.runtime.sendMessage('pmlnbkoiiamffenppfmjgfggfhgnlcac', {
    method : 'down',
    data   : {
        url : 'http://dldir1.qq.com/qqfile/QQforMac/QQ_V3.0.2.dmg',
        eng : 'thunder'
    }
});
```
