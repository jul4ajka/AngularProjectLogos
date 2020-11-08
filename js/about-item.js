var fs = require('fs');

function ItemsInfo() {
    
}

ItemsInfo.prototype.readInfo = function () {
    return fs.readFileSync('./text/about-item.txt'); 
    // зчитує щось з файлу
};
ItemsInfo.prototype.writeInfo = function (data) {
    return fs.writeFile('./text/about-item.txt', data, function (err) {
        if (err) throw err;
        console.log('It\'s saved!');
    }); // запис у файл, повністю перезаписує файл
};

global.ItemsInfo = ItemsInfo;