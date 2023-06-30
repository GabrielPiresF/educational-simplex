// mousewheel or two-finger scroll zooms the plot

import {parse} from './lp.js';
import {Model} from './model.js';

const fileInput = document.getElementById('file');
const filePreview = document.getElementById('preview');
const fileDownload = document.getElementById('download');
const fileExecute = document.getElementById('execute');
let variableIn;
let variableOut;
let model;

fileInput.addEventListener('change', function(){
    const file = this.files[0];
    const reader = new FileReader();
    reader.addEventListener('load', function(){
        if(reader.result != null)    
            filePreview.value = reader.result;
    });
    if(file){
        reader.readAsText(file);
    }
    document.getElementById('file').value = null;
});

filePreview.addEventListener('keydown', function(event){
    if(event.key == 'Tab'){
        const start = filePreview.selectionStart;
        const end = filePreview.selectionEnd;
        filePreview.value = filePreview.value.substring(0, start) + '\t' + filePreview.value.substring(end);
        filePreview.selectionStart = filePreview.selectionEnd = start+1;
        event.preventDefault();
    }
})

const download = function(){
    const a = document.createElement('a');
    a.style = 'display: none';
    document.body.appendChild(a);
    return function(content, fileName){
        const blob = new Blob([content], {type: 'octet/stream'});
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

fileDownload.addEventListener('click', function(){
    download()(filePreview.value, 'model.txt');
});

fileExecute.addEventListener('click', function(){
    const lpResult = parse(filePreview.value);
    //console.log(lpResult);
    model = new Model(lpResult);
    updateBottons();
});

const updateBottons = function(){
    if(model.base[0] == null)
        for(let i = 1; i < model.countTerms; i++){
            if(model.body[0][i].n != 0){
                const button = document.getElementById(model.variables[i-1]);
                button.addEventListener('click', function(){
                    variableIn = button.value;
                    model.showLimits(variableIn);
                });
            }
        }
    else
        for(let i = 1; i < model.countTerms; i++){
            if(model.body[0][i].n != 0 && i != model.base[0]){
                const button = document.getElementById(model.variables[i-1]);
                button.addEventListener('click', function(){
                    variableIn = button.value;                    
                    model.showLimits(variableIn);
                });
            }
        }
    for(let i = 1; i < model.countExpressions; i++){
        if(model.base[i] != null){
            const button = document.getElementById('E' + model.variables[model.base[i] - 1]);
            button.addEventListener('click', function(){
                const index = button.value.indexOf(',');
                if(button.value.substring(index+1) == 'true'){
                    variableOut = button.value.substring(0, index);
                    model.pivoting(parseInt(variableIn), parseInt(variableOut));
                    updateBottons();
                }
            });
        }
    }
}

/* variableIn.addEventListener('click', function(){
    this.console.log(variableIn.value);
}); */

var trace1 = {
    x:['2020-10-04', '2021-11-04', '2023-12-04'],
    y: [90, 40, 60],
    type: 'scatter'
};

var data = [trace1];

var layout = {
    title: 'Scroll and Zoom',
    showlegend: false
};

Plotly.newPlot('graph', data, layout, {scrollZoom: true});
