
class Data {
    
  constructor() {}

  async getData(path) {
    console.log("Loading data for " + path);
    try {
      let json = await this.readJSON(path);
      return json;
    } catch(err) {
      throw new Error(err);
    }
  }

 readJSON(path) {
   return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', path, true);
    xhr.responseType = 'blob';
    xhr.onload = function(e) { 
      if (this.status == 200) {
          var file = new File([this.response], 'temp');
          var fileReader = new FileReader();
          fileReader.addEventListener('load', function(){
              const json = JSON.parse(fileReader.result);
              resolve(json);
          });
          fileReader.readAsText(file);
      } else {
        reject(new Error('Error on loading json data'));
      }
    }
    xhr.send();
    });
  }
}

export { Data };