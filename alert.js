const alertsContainer = document.getElementById('alerts-container');

export function insertSyntaxErrorAlert(error){
    alertsContainer.innerHTML = "<div class=\'alert alert-danger alert-dismissible fade show\'\>\n\t<h4 class=\'alert-heading\'><i class=\'bi-exclamation-octagon-fill\'></i> O modelo fornecido é inválido</h4\><hr\><p\>" + error.toString().replace('SyntaxError: Expected', 'Há um erro sintático no modelo.</p\><p\>Era esperado').replace(', or', ' ou').replace(' but', ', mas').replace('found', 'foi encontrado') + "</p\><button type=\'button\' class=\'btn-close\' data-bs-dismiss=\'alert\'></button\>\n</div\>";
}

export function insertUnfeasibleProblemAlert(){
    alertsContainer.innerHTML = "<div class=\'alert alert-warning alert-dismissible fade show\'\>\n\t<h4 class=\'alert-heading\'><i class=\'bi-exclamation-triangle-fill\'></i> O problema é inviável</h4\><hr\><p\>Não foi possível encontrar um vértice viável através do método de duas fases.</p\><button type=\'button\' class=\'btn-close\' data-bs-dismiss=\'alert\'></button\>\n</div\>";
}

export function insertUnlimitedProblemAlert(variable){
    alertsContainer.innerHTML = "<div class=\'alert alert-warning alert-dismissible fade show\'\>\n\t<h4 class=\'alert-heading\'><i class=\'bi-exclamation-triangle-fill\'></i> O problema é ilimitado</h4\><hr\><p\>A variável " + (variable.length > 1 ? variable.charAt(0) + '<sub style=\'font-size: 60%;\'\>' + variable.substring(1) + '</sub\>' : variable) + " pode crescer infinitamente.</p\><button type=\'button\' class=\'btn-close\' data-bs-dismiss=\'alert\'></button\>\n</div\>";
}

export function insertGreatFoundAlert(point, value){
    alertsContainer.innerHTML = "<div class=\'alert alert-success alert-dismissible fade show\'\>\n\t<h4 class=\'alert-heading\'><i class=\'bi-check-circle-fill\'></i> O valor ótimo foi encontrado</h4\><hr\><p\>O valor ótimo encontrado no ponto [" + point + "] é </p\><button type=\'button\' class=\'btn-close\' data-bs-dismiss=\'alert\'></button\>\n</div\>";
    const paragraph = alertsContainer.getElementsByTagName('p')[0];
    if(value.s == -1)
        paragraph.appendChild(document.createTextNode('-'));
    if(value.d == 1)
        paragraph.appendChild(document.createTextNode(value.n));
    else
        fractionToHTML(paragraph, value);
    paragraph.appendChild(document.createTextNode('.'));
}

export function insertCurrentIsViablePointAlert(){
    alertsContainer.innerHTML = "<div class=\'alert alert-warning alert-dismissible fade show\'\>\n\t<h4 class=\'alert-heading\'><i class=\'bi-exclamation-triangle-fill\'></i> O ponto atual já é viável</h4\><hr\><p\>Não há necessidade de aplicar o método de duas fases para encontrar um ponto viável.</p\><button type=\'button\' class=\'btn-close\' data-bs-dismiss=\'alert\'></button\>\n</div\>";
}

export function insertViablePointFoundAlert(point){
    alertsContainer.innerHTML = "<div class=\'alert alert-success alert-dismissible fade show\'\>\n\t<h4 class=\'alert-heading\'><i class=\'bi-check-circle-fill\'></i> O método de duas fases encontrou um ponto viável</h4\><hr\><p\>O ponto viável encontrado pelo método de duas fases é [" + point + "].</p\><button type=\'button\' class=\'btn-close\' data-bs-dismiss=\'alert\'></button\>\n</div\>";
}

function fractionToHTML(element, value){
    const math = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math');
    const mfrac = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'mfrac');
    const min = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'mi');
    min.appendChild(document.createTextNode(value.n.toString()));
    const mid = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'mi');                        
    mid.appendChild(document.createTextNode(value.d.toString()));
    mfrac.appendChild(min);
    mfrac.appendChild(mid);
    math.appendChild(mfrac);
    element.appendChild(math);
}