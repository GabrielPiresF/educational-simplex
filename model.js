import {insertUnfeasibleProblemAlert,
    insertUnlimitedProblemAlert,
    insertGreatFoundAlert,
    insertViablePointFoundAlert} from './alert.js'

const infinity = 10000;

export class Model{
    constructor(matrix){
        this.type = matrix[0];
        this.variables = new Set();
        this.variablesPosition = new Map();
        this.countExpressions = matrix[2].length + (matrix[3] != null ? matrix[3].length : 0) + 1;
        this.base = Array(this.countExpressions).fill(null);
        this.baseSet = new Set();
        this.datas = null;
        this.layout = null;
        this.config = null;
        this.dimensions = 0;
        this.variablesGraph = null;
        this.twoPhasesActive = false;
        this.executeSimplexActive = false;
        this.states = null;
        this.oldType = null;
        this.oldObjective = null;
        this.limits = null;
        this.finishedExecution = 0;
        if(matrix[1][0] != null)
            this.variables.add(matrix[1][0]);
        matrix[1][1].forEach(element => {
            if(element[1] != null && !this.variables.has(element[1]))
                this.variables.add(element[1]);
        });
        let countS = 0;
        matrix[2].forEach(restriction => {
            restriction[1].forEach(element => {
                if(element[1] != null && !this.variables.has(element[1]))
                    this.variables.add(element[1]);
            });
            if(restriction[2] != 0){                
                countS++;
                this.variables.add('S'+countS.toString());
            }
        });
        if(matrix[3] != null)
            matrix[3].forEach(element => {
                if(element[0] != null && !this.variables.has(element[0]))
                    this.variables.add(element[0]);
                countS++;
                this.variables.add('S'+countS.toString());
            });
        if(matrix[4] != null)
            matrix[4].forEach(element => {
                if(!this.variables.has(element))
                    this.variables.add(element);
            });
        this.variables = Array.from(this.variables).sort();
        this.variablesPosition.set(null, 0);
        for(let i = 0; i < this.variables.length; i++)
            this.variablesPosition.set(this.variables[i], i+1);
        this.countTerms = this.variables.length+1;
        this.body = new Array(this.countExpressions).fill().map(() => Array(this.countTerms).fill(math.fraction(math.number(0))));
        matrix[1][1].forEach(element => {
            const position = this.variablesPosition.get(element[1]);
            this.body[0][position] = this.body[0][position].add(math.fraction(math.number(element[0])));
        });
        if(matrix[1][0] != null){
            const position = this.variablesPosition.get(matrix[1][0]);
            this.base[0] = position;
            this.baseSet.add(position);
            if(this.body[0][position] != 0){
                this.body[0][position] = math.fraction('1').sub(this.body[0][position]);
                this.normalize(0, position);
            }
            else
                this.body[0][position] = math.fraction('1');
        }
        countS = 0;
        let countE = 1;
        for(let i = 0; i < matrix[2].length; i++){
            for(let j = 0; j < matrix[2][i][1].length; j++){
                const position = this.variablesPosition.get(matrix[2][i][1][j][1]);
                this.body[countE][position] = this.body[countE][position].add(math.fraction(math.number(matrix[2][i][1][j][0])));
            }
            this.body[countE][0] = this.body[countE][0].add(math.fraction(math.number(-matrix[2][i][3])));
            switch(matrix[2][i][2]){
                case 1:                    
                    countS++;
                    this.body[countE][this.variablesPosition.get('S'+countS.toString())] = math.fraction('1');
                    break;
                case 2:                    
                    countS++;
                    this.body[countE][this.variablesPosition.get('S'+countS.toString())] = math.fraction('-1');
            }
            countE++;
        }
        if(matrix[3] != null)
            for(let i = 0; i < matrix[3].length; i++){
                const position = this.variablesPosition.get(matrix[3][i][0]);
                this.body[countE][position] = math.fraction('1');
                this.body[countE][0] = math.fraction(math.number(-matrix[3][i][2]));
                if(matrix[3][i][1] == 1){
                    countS++;
                    this.body[countE][this.variablesPosition.get('S'+countS.toString())] = math.fraction('1');
                }
                else{
                    countS++;
                    this.body[countE][this.variablesPosition.get('S'+countS.toString())] = math.fraction('-1');
                }                
                countE++;
            }
        this.replace(0);
        this.generateDatas(matrix);
        for(let i = 1; i < this.countExpressions; i++){
            let j = 1;
            for(; j < this.countTerms; j++)
                if(this.body[i][j].n != 0 && !this.baseSet.has(j)){
                    this.base[i] = j;
                    this.baseSet.add(j);
                    this.insert(i, j);
                    break;
                }
            if(j == this.countTerms)
                this.base[i] = null;
        }
        this.createTable();
        this.generateGraph();
    }


    invert(x, y){
        return math.fraction((this.body[x][y].s == 1 ? '' : '-') + this.body[x][y].d.toString() + '/' + this.body[x][y].n.toString());
    }


    normalize(x, y){
        const normalize = this.invert(x, y);
        for(let i = 0; i < this.countTerms; i++)
            this.body[x][i] = math.multiply(this.body[x][i], normalize);
    }


    replace(expression){
        const substitute = this.base[expression];
        if(substitute != null){
            for(let i = 0; i < this.countExpressions; i++){            
                const value = this.body[i][substitute];
                if(i != expression && value.n != 0){
                    for(let j = 0; j < this.countTerms; j++)
                        if(j != substitute)
                            this.body[i][j] = math.add(this.body[i][j], math.multiply(this.body[expression][j], value));
                    this.body[i][substitute] = math.fraction('0');
                }
            }
        }
    }


    insert(x, y){
        this.body[x][y] = math.multiply(math.fraction('-1'), this.body[x][y]);
        this.normalize(x, y);
        this.replace(x);
    }


    createTable(){
        const dictionary = document.getElementById('dictionary');
        dictionary.replaceChildren()
        const table = document.createElement('table');
        table.style.width = '100%';
        table.setAttribute('border', '0');
        const thead = table.createTHead();
        for(let i = 0; i < this.countExpressions; i++){
            const row = thead.insertRow();
            let element = document.createElement('td');            
            let symbol = document.createElement('td');
            if(this.base[i] != null){
                const variable = this.variables[this.base[i] - 1];
                const button = document.createElement('button');
                button.id = 'E' + variable;
                button.classList.add('variableOut');
                button.value = [this.base[i], false];
                button.appendChild(document.createTextNode(variable[0]));
                if(variable.length > 1){
                    const sub = document.createElement('sub');
                    sub.appendChild(document.createTextNode(variable.substring(1)));
                    sub.style.fontSize = '60%';
                    button.appendChild(sub);
                }
                element.appendChild(button);
                symbol.appendChild(document.createTextNode('='));
            }
            row.appendChild(element);
            row.appendChild(symbol);
            let withoutfirst = true;
            for(let j = 0; j < this.countTerms; j++){
                if(!this.baseSet.has(j)){
                    element = document.createElement('td');
                    if(j != this.base[i] && (this.body[i][j].n != 0 || j == 0)){
                        symbol = document.createElement('td');
                        if(this.body[i][j].s == -1)
                            symbol.appendChild(document.createTextNode('-'))
                        else{
                            if(!withoutfirst)
                                symbol.appendChild(document.createTextNode('+'))
                        }
                        if(withoutfirst)
                            withoutfirst = false;
                        row.appendChild(symbol);
                        if(this.body[i][j].d != 1)
                            this.addFractionToDictionary(element, this.body[i][j]);
                        else if(j == 0 || this.body[i][j].n != 1)
                            element.appendChild(document.createTextNode(this.body[i][j].n.toString()));
                        if(j > 0){
                            const variable = this.variables[j - 1];
                            if(i == 0){
                                const button = document.createElement('button');
                                button.id = variable;
                                button.classList.add('button');
                                button.classList.add('variableIn');
                                button.value = j;
                                button.appendChild(document.createTextNode(variable[0]));
                                if(variable.length > 1){
                                    const sub = document.createElement('sub');
                                    sub.appendChild(document.createTextNode(variable.substring(1)));
                                    sub.style.fontSize = '60%';
                                    button.appendChild(sub);
                                }
                                element.appendChild(button);
                            }
                            else{
                                element.appendChild(document.createTextNode(variable[0]));
                                if(variable.length > 1){
                                    const sub = document.createElement('sub');
                                    sub.appendChild(document.createTextNode(variable.substring(1)));
                                    sub.style.fontSize = '60%';
                                    element.appendChild(sub);
                                }
                            }
                        }
                    }
                    else                
                        row.appendChild(document.createElement('td'));
                    row.appendChild(element);
                }
            }
        }
        dictionary.appendChild(table);

        const twoPhases = document.createElement('button');
        twoPhases.appendChild(document.createTextNode('EXECUTAR DUAS FASES'))
        twoPhases.id = 'twoPhases';
        twoPhases.classList.add('button');
        dictionary.appendChild(twoPhases);

        const executeSimplex = document.createElement('button');
        executeSimplex.appendChild(document.createTextNode('EXECUTAR SIMPLEX'))
        executeSimplex.id = 'executeSimplex';
        executeSimplex.classList.add('button');
        dictionary.appendChild(executeSimplex);
    }


    showCurrentState(){
        const dictionary = document.getElementById('dictionary');
        const table = document.createElement('table');
        table.style.width = '100%';
        table.setAttribute('border', '0');
        const thead = table.createTHead();
        for(let i = 0; i < this.countExpressions; i++){
            const row = thead.insertRow();
            let element = document.createElement('td');            
            let symbol = document.createElement('td');
            if(this.base[i] != null){
                const variable = this.variables[this.base[i] - 1];
                const button = document.createElement('button');
                button.id = 'E' + variable;
                button.classList.add('variableOut');
                button.value = [this.base[i], false];
                button.appendChild(document.createTextNode(variable[0]));
                if(variable.length > 1){
                    const sub = document.createElement('sub');
                    sub.appendChild(document.createTextNode(variable.substring(1)));
                    sub.style.fontSize = '60%';
                    button.appendChild(sub);
                }
                element.appendChild(button);
                symbol.appendChild(document.createTextNode('='));
            }
            row.appendChild(element);
            row.appendChild(symbol);
            let withoutfirst = true;
            for(let j = 0; j < this.countTerms; j++){
                if(!this.baseSet.has(j)){
                    element = document.createElement('td');
                    if(j != this.base[i] && (this.body[i][j].n != 0 || j == 0)){
                        symbol = document.createElement('td');
                        if(this.body[i][j].s == -1)
                            symbol.appendChild(document.createTextNode('-'))
                        else{
                            if(!withoutfirst)
                                symbol.appendChild(document.createTextNode('+'))
                        }
                        if(withoutfirst)
                            withoutfirst = false;
                        row.appendChild(symbol);
                        if(this.body[i][j].d != 1)
                            this.addFractionToDictionary(element, this.body[i][j]);
                        else if(j == 0 || this.body[i][j].n != 1)
                            element.appendChild(document.createTextNode(this.body[i][j].n.toString()));
                        if(j > 0){
                            const variable = this.variables[j - 1];
                            element.appendChild(document.createTextNode(variable[0]));
                            if(variable.length > 1){
                                const sub = document.createElement('sub');
                                sub.appendChild(document.createTextNode(variable.substring(1)));
                                sub.style.fontSize = '60%';
                                element.appendChild(sub);
                            }
                            
                        }
                    }
                    else                
                        row.appendChild(document.createElement('td'));
                    row.appendChild(element);
                }
            }
        }
        dictionary.replaceChild(table, document.getElementsByTagName('table')[0]);
    }


    showCurrentStateLimits(variableIndex){
        const variable = this.variables[variableIndex - 1];
        this.limits = new Array();
        for(let i = 1; i < this.countExpressions; i++){
            if(this.base[i] != null){
                const button = document.getElementById('E'+this.variables[this.base[i]-1]);
                if(this.body[i][variableIndex].n !=0){
                    const row = button.parentElement.parentElement;
                    const element = document.createElement('td');                
                    element.appendChild(document.createTextNode(variable[0]));
                    element.classList.add('limit');
                    if(variable.length > 1){
                        const sub = document.createElement('sub');
                        sub.appendChild(document.createTextNode(variable.substring(1)));
                        sub.style.fontSize = '60%';
                        element.appendChild(sub);
                    }
                    if(this.body[i][variableIndex].s == -1){
                        element.appendChild(document.createTextNode('<='));
                        const limit = math.multiply(math.fraction('-1'), math.divide(this.body[i][0], this.body[i][variableIndex]));
                        if(limit.s == -1)
                            element.appendChild(document.createTextNode('-'));
                        if(limit.d == 1)
                            element.appendChild(document.createTextNode(limit.n.toString()));
                        else
                            this.addFractionToDictionary(element, limit);
                        this.limits.push({type: true, index: i, value: limit.s*limit.n/limit.d});
                    }
                    else{                        
                        this.limits.push({type: false, index: i});
                        element.appendChild(document.createTextNode(' É ILIMITADO'));
                    }
                    row.appendChild(element);                    
                    button.value = [button.value.substring(0, button.value.indexOf(',')), true];
                }
                else{                    
                    button.classList.add('variableOut');
                    button.classList.remove('button');
                    button.value = [button.value.substring(0, button.value.indexOf(',')), false];
                }
            }
        }
    }


    addFractionToDictionary(element, value){
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


    beginStates(){
        this.states = [];
    }


    enableSimplexExecution(){
        this.executeSimplexActive = true;
    }


    isTheCurrentPointValid(){
        for(let i = 1; i < this.countExpressions; i++)
            if(this.body[i][0].s == -1 && this.body[i][0].n != 0)
                return false;
        return true;
    }


    insertA(){
        this.oldObjective = new Array();
        this.oldType = this.type;
        this.type = false;
        for(let i = 0; i < this.countTerms; i++)
            this.oldObjective.push(this.body[0][i]);
        this.variables.push('A');
        const zero = math.fraction('0');
        for(let i = 0; i < this.countTerms; i++)
            if(!this.baseSet.has(i))
                this.body[0][i] = zero;
        this.countTerms++;
        const one = math.fraction('1');
        for(let i = 0; i < this.countExpressions; i++)
            this.body[i].push(one);
        this.twoPhasesActive = true;
    }


    getSmallerExpression(){
        let smaller = 1;
        for(let i = 2; i < this.countExpressions; i++)
            if(this.body[smaller][0].s*this.body[smaller][0].n/this.body[smaller][0].d > this.body[i][0].s*this.body[i][0].n/this.body[i][0].d)
                smaller = i;
        return smaller;
    }


    getSmallerVariable(){
        let smaller = 1;
        if(this.base[0] == smaller)
            smaller++;
        for(let i = smaller + 1; i < this.countTerms; i++)
            if(this.base[0] != i && this.body[0][smaller].s*this.body[0][smaller].n/this.body[0][smaller].d > this.body[0][i].s*this.body[0][i].n/this.body[0][i].d)
                smaller = i;
        return smaller;
    }


    getBiggerVariable(){
        let bigger = 1;
        if(this.base[0] == bigger)
            bigger++;
        for(let i = bigger + 1; i < this.countTerms; i++)
            if(this.base[0] != i && this.body[0][bigger].s*this.body[0][bigger].n/this.body[0][bigger].d < this.body[0][i].s*this.body[0][i].n/this.body[0][i].d)
                bigger = i;
        return bigger;
    }


    next(){
        switch(this.states.length){
            case 0:
                this.finishedExecution = 0;
                if(this.twoPhasesActive){
                    const variableOut = this.base[this.getSmallerExpression()];
                    this.states.push({type: 0, variableIn: this.countTerms - 1, variableOut: variableOut});
                    this.pivoting(this.states[this.states.length - 1].variableIn, this.states[this.states.length - 1].variableOut);
                    this.showCurrentState();
                    this.updateDatas();
                    break;
                }
            default:{
                if(this.states.length == 0 || this.states[this.states.length - 1].type != 1){
                    let variableIn;
                    if(this.type)
                        variableIn = this.getBiggerVariable();
                    else
                        variableIn = this.getSmallerVariable();
                    if(this.body[0][variableIn].n == 0 || (this.type && this.body[0][variableIn].s < 0) || (!this.type && this.body[0][variableIn].s > 0)){ // se a variável selecionada para entrar não melhora a função objetivo, então chegou no ótimo.
                        if(this.twoPhasesActive && this.body[0][0].n == 0 && this.baseSet.has(this.countTerms - 1)){ // se chegou no ótimo enquanto o método de duas fases está ativo (e o ótimo é igual a zero), mas a variável artificial 'A' está na base
                            let variableIn = 1;
                            for(; variableIn < this.countTerms - 1 && (this.base[0] == variableIn); variableIn++);
                            if(variableIn == this.countTerms - 1)
                                insertUnfeasibleProblemAlert();
                            else{
                                this.states.push({type: 4, variableIn: variableIn, variableOut: this.countTerms - 1});
                                this.pivoting(this.states[this.states.length - 1].variableIn, this.states[this.states.length - 1].variableOut);
                                this.showCurrentState();
                                this.updateDatas();
                            }
                            return;
                        }
                        if(this.twoPhasesActive){
                            if(this.body[0][0].n != 0){
                                insertUnfeasibleProblemAlert();
                                return;
                            }
                            const aCoefficient = new Array();
                            this.variables.pop();
                            this.type = this.oldType;
                            this.countTerms--;
                            for(let i = 0; i < this.countExpressions; i++)
                                aCoefficient.push(this.body[i].pop());
                            this.states.push({type: 3, aCoefficient: aCoefficient});
                            for(let i = 0; i < this.oldObjective.length; i++)
                                this.body[0][i] = this.oldObjective[i];
                            for(let i = 1; i < this.countExpressions; i++)
                                this.replace(i);
                            this.twoPhasesActive = false;
                            if(!this.executeSimplexActive)
                                this.finishedExecution = 1;
                            else
                                this.showCurrentState();
                            insertViablePointFoundAlert(this.generateCurrentPointHTML());
                        }
                        else{
                            insertGreatFoundAlert(this.generateCurrentPointHTML(), this.body[0][0]);
                            this.executeSimplexActive = false;
                            this.finishedExecution = 1;
                        }
                        this.updateDatas();
                    }
                    else{
                        this.states.push({type: 1, variableIn: variableIn});
                        this.showCurrentStateLimits(variableIn);
                    }
                }
                else{
                    let variableOut = 0;
                    for(; variableOut < this.limits.length && !this.limits[variableOut].type; variableOut++);
                    if(variableOut >= this.limits.length)
                        insertUnlimitedProblemAlert(this.variables[this.states[this.states.length - 1].variableIn - 1]);
                    else{
                        for(let i = variableOut + 1; i < this.limits.length; i++)
                            if(this.limits[i].type && this.limits[i].value < this.limits[variableOut].value)
                                variableOut = i;
                        variableOut = this.base[this.limits[variableOut].index];
                        this.states.push({type: 2, variableOut: variableOut});
                        this.pivoting(this.states[this.states.length - 2].variableIn, variableOut);
                        this.showCurrentState();
                        this.updateDatas();
                    }
                }
            }
        }
    }


    previous(){
        switch(this.states.length){
            case 0:
                if(this.twoPhasesActive){
                    this.variables.pop();
                    this.type = this.oldType;
                    this.countTerms--;
                    for(let i = 1; i < this.countExpressions; i++)
                        this.body[i].pop();
                    this.body[0] = this.oldObjective;
                    for(let i = 1; i < this.countExpressions; i++)
                        this.replace(i);
                    this.twoPhasesActive = false;
                }
                this.executeSimplexActive = false;
                this.finishedExecution = 1;
                this.updateDatas();
                break;
            default:{
                switch(this.states[this.states.length - 1].type){
                    case 0:
                        this.pivoting(this.states[this.states.length - 1].variableOut, this.states[this.states.length - 1].variableIn);
                        this.showCurrentState();
                        this.updateDatas();
                        this.states.pop();
                        break;
                    case 1:
                        this.showCurrentStateLimits(this.states[this.states.length - 1].variableIn);
                        this.removeAllLimitsFromDictionary();
                        this.states.pop();
                        break;
                    case 2:
                        this.pivoting(this.states[this.states.length - 1].variableOut, this.states[this.states.length - 2].variableIn);
                        this.showCurrentState();
                        this.showCurrentStateLimits(this.states[this.states.length - 2].variableIn);
                        this.updateDatas();
                        this.states.pop();
                        break;
                    case 3:
                        const zero = math.fraction('0');
                        for(let i = 0; i < this.countTerms; i++)
                            this.body[0][i] = zero;
                        for(let i = 0; i < this.countExpressions; i++)
                            this.body[i].push(this.states[this.states.length - 1].aCoefficient[i]);
                        this.variables.push('A');
                        this.countTerms++;
                        this.type = false;
                        this.twoPhasesActive = true;
                        this.showCurrentState();
                        this.updateDatas();
                        this.states.pop();
                        break;
                    case 4:
                        this.pivoting(this.states[this.states.length - 1].variableOut, this.states[this.states.length - 1].variableIn);
                        this.showCurrentState();
                        this.updateDatas();
                        this.states.pop();
                }
            }
        }
    }


    removeAllLimitsFromDictionary(){
        while(true){
            const limit = document.querySelector('.limit');
            if(limit == null)
                break;
            limit.remove();
        }
    }


    showLimits(variableIndex){
        this.removeAllLimitsFromDictionary();
        const variable = this.variables[variableIndex - 1];
        for(let i = 1; i < this.countExpressions; i++){
            if(this.base[i] != null){
                const button = document.getElementById('E'+this.variables[this.base[i]-1]);
                if(this.body[i][variableIndex].n !=0){
                    button.classList.remove('variableOut');
                    button.classList.add('button');
                    const row = button.parentElement.parentElement;
                    const element = document.createElement('td');                
                    element.appendChild(document.createTextNode(variable[0]));
                    element.classList.add('limit');
                    if(variable.length > 1){
                        const sub = document.createElement('sub');
                        sub.appendChild(document.createTextNode(variable.substring(1)));
                        sub.style.fontSize = '60%';
                        element.appendChild(sub);
                    }
                    if(this.body[i][variableIndex].s == -1){
                        element.appendChild(document.createTextNode('<='));
                        const limit = math.multiply(math.fraction('-1'), math.divide(this.body[i][0], this.body[i][variableIndex]));
                        if(limit.s == -1)
                            element.appendChild(document.createTextNode('-'));
                        if(limit.d == 1)
                            element.appendChild(document.createTextNode(limit.n.toString()));
                        else
                            this.addFractionToDictionary(element, limit);
                    }
                    else
                        element.appendChild(document.createTextNode(' É ILIMITADO'));
                    row.appendChild(element);                    
                    button.value = [button.value.substring(0, button.value.indexOf(',')), true];
                }
                else{                    
                    button.classList.add('variableOut');
                    button.classList.remove('button');
                    button.value = [button.value.substring(0, button.value.indexOf(',')), false];
                }
            }
        }
    }


    pivoting(variableIn, variableOut){
        let index = this.base.indexOf(variableOut);
        this.body[index][variableOut] = math.fraction('-1');
        this.base[index] = variableIn;
        this.baseSet.add(variableIn);
        this.baseSet.delete(variableOut);
        this.insert(index, variableIn);
    }


    generateDatas(matrix){
        this.variablesGraph = new Array();
        for(let i = 1; i < this.countTerms; i++)
            if(!this.baseSet.has(i) && this.variables[i - 1].charAt(0) != 'S')
                this.variablesGraph.push(i);
        this.dimensions = this.variablesGraph.length;
        if(this.dimensions == 2){
            this.datas = new Array();
            const xPosition = this.variablesGraph[0];
            const yPosition = this.variablesGraph[1];
            for(let i = 1; i < this.countExpressions; i++){
                if(this.body[i][yPosition].n != 0){
                    const normalize = '(' + (this.body[i][yPosition].s*this.body[i][yPosition].d/this.body[i][yPosition].n) + ')';
                    const expression = normalize + '*(' + -this.body[i][xPosition] + ')*x+' + normalize + '*(' + -this.body[i][0] + ')';
                    const xValues = [-infinity, infinity];
                    const yValues = new Array();
                    xValues.forEach(x => {
                        yValues.push(eval(expression));
                    });
                    switch(this.getType(matrix, i)){
                        case 0:
                            this.datas.push({x: xValues, y: yValues, mode: 'lines', name: this.getExpression(matrix, i)});
                            break;
                        case 1:
                            if(this.body[i][yPosition].s == 1)
                                this.datas.push({x: xValues.concat([infinity, -infinity]), y: yValues.concat([-infinity, -infinity]), mode: 'lines', name: this.getExpression(matrix, i), fill: 'toself'});
                            else
                                this.datas.push({x: xValues.concat([infinity, -infinity]), y: yValues.concat([infinity, infinity]), mode: 'lines', name: this.getExpression(matrix, i), fill: 'toself'});
                            break;
                        case 2:
                            if(this.body[i][yPosition].s == 1)
                                this.datas.push({x: xValues.concat([infinity, -infinity]), y: yValues.concat([infinity, infinity]), mode: 'lines', name: this.getExpression(matrix, i), fill: 'toself'});
                            else
                                this.datas.push({x: xValues.concat([infinity, -infinity]), y: yValues.concat([-infinity, -infinity]), mode: 'lines', name: this.getExpression(matrix, i), fill: 'toself'});
                    }
                }
                else if(this.body[i][xPosition].n != 0){
                    const value = eval('(' + this.body[i][xPosition].s*this.body[i][xPosition].d/this.body[i][xPosition].n + ')*(' + -this.body[i][0] + ')');
                    const xValues = [value, value];
                    const yValues = [-infinity, infinity];
                    switch(this.getType(matrix, i)){
                        case 0:
                            this.datas.push({x: xValues, y: yValues, mode: 'lines', name: this.getExpression(matrix, i)});
                            break;
                        case 1:
                            if(this.body[i][xPosition].s == 1)
                                this.datas.push({x: xValues.concat([-infinity, -infinity]), y: yValues.concat([infinity, -infinity]), mode: 'lines', name: this.getExpression(matrix, i), fill: 'toself'});
                            else
                                this.datas.push({x: xValues.concat([infinity, infinity]), y: yValues.concat([infinity, -infinity]), mode: 'lines', name: this.getExpression(matrix, i), fill: 'toself'});
                            break;
                        case 2:
                            if(this.body[i][xPosition].s == 1)
                                this.datas.push({x: xValues.concat([infinity, infinity]), y: yValues.concat([infinity, -infinity]), mode: 'lines', name: this.getExpression(matrix, i), fill: 'toself'});
                            else
                                this.datas.push({x: xValues.concat([-infinity, -infinity]), y: yValues.concat([infinity, -infinity]), mode: 'lines', name: this.getExpression(matrix, i), fill: 'toself'});
                    }
                }
            }
        }
    }

    getType(matrix, index){
        if(index < matrix[2].length + 1)
            return matrix[2][index - 1][2];
        return matrix[3][index - matrix[2].length - 1][1];
    }

    getExpression(matrix, index){
        if(index < matrix[2].length + 1)
            return matrix[2][index - 1][0];
        switch(matrix[3][index - matrix[2].length - 1][1]){
            case 1:
                return matrix[3][index - matrix[2].length - 1][0] + '\u2264' + matrix[3][index - matrix[2].length - 1][2];
            case 2:
                return matrix[3][index - matrix[2].length - 1][0] + '\u2265' + matrix[3][index - matrix[2].length - 1][2];
        }
    }


    generateCurrentPointText(){
        let text = '';
        for(let i = 1; i < this.countTerms; i++){
            if(this.baseSet.has(i)){
                const index = this.base.indexOf(i)
                text += '(' + this.variables[i - 1] + ': ' + (this.body[index][0].s*this.body[index][0].n/this.body[index][0].d).toString() + '), \n';
            }
            else
                text += '(' + this.variables[i - 1] + ': 0), ';
        }
        return text.substring(0, text.length - 3);
    }


    generateCurrentPointHTML(){
        let text = '';
        for(let i = 1; i < this.countTerms; i++){
            if(this.baseSet.has(i)){
                const index = this.base.indexOf(i)
                text += '(' + (this.variables[i - 1].length > 1 ? this.variables[i - 1].charAt(0) + '<sub style=\'font-size: 60%;\'\>' + this.variables[i - 1].substring(1) + '</sub\>' : this.variables[i - 1]) + ': ' + (this.body[index][0].s*this.body[index][0].n/this.body[index][0].d).toString() + '), \n';
            }
            else
                text += '(' + (this.variables[i - 1].length > 1 ? this.variables[i - 1].charAt(0) + '<sub style=\'font-size: 60%;\'\>' + this.variables[i - 1].substring(1) + '</sub\>' : this.variables[i - 1]) + ': 0), ';
        }
        return text.substring(0, text.length - 3);
    }


    generateGraph(){
        if(this.dimensions == 2){
            this.datas.push({x: [-infinity, infinity], y:[0, 0], name: this.variables[this.variablesGraph[0] - 1] + '=0', mode: 'lines'});
            this.datas.push({x: [0, 0], y:[-infinity, infinity], name: this.variables[this.variablesGraph[1] - 1] + '=0', mode: 'lines'});
            this.layout = {
                showlegend: true,
                xaxis: {range: [-20, 20]},
                yaxis: {range: [-5, 10]},
                dragmode: false,
                height: 0.3375*(window.innerWidth > 900 ? window.innerWidth : 900),
                width: 0.9*(window.innerWidth > 900 ? window.innerWidth : 900)
            };
            this.config = {scrollZoom: true, editable: false, modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'resetScale2d', 'select2d', 'toImage', 'zoom2d']};
            let xValue = math.fraction('0');
            let yValue = math.fraction('0');
            if(this.baseSet.has(this.variablesGraph[0]))
                xValue = this.body[this.base.indexOf(this.variablesGraph[0])][0];
            if(this.baseSet.has(this.variablesGraph[1]))
                yValue = this.body[this.base.indexOf(this.variablesGraph[1])][0];
            const x = xValue.s*xValue.n/xValue.d
            const y = yValue.s*yValue.n/yValue.d
            this.datas.push({
                x: [x],
                y: [y],
                mode: 'lines+markers',
                marker: {symbol: 'arrow', size: 12, angleref: 'previous', standoff: 6},
                type: 'scatter',
                name: 'caminho'
            });
            this.datas.push({
                x: [x],
                y: [y],
                text: [this.generateCurrentPointText()],
                mode: 'markers',
                marker: {size: 12},
                type: 'scatter',
                name: 'pontos'
            });
            Plotly.newPlot('graph', this.datas, this.layout, this.config);
            const pan = document.querySelector('a[data-title="Pan"');
            pan.click();
        }
        else{
            const graph = document.getElementById('graph');
            graph.replaceChildren();
        }
    }

    updateDatas(){
        if(this.dimensions == 2){            
            let xValue = math.fraction('0');
            let yValue = math.fraction('0');
            let text = '';
            if(this.baseSet.has(this.variablesGraph[0]))
                xValue = this.body[this.base.indexOf(this.variablesGraph[0])][0];
            if(this.baseSet.has(this.variablesGraph[1]))
                yValue = this.body[this.base.indexOf(this.variablesGraph[1])][0];
            for(let i = 1; i < this.countTerms; i++){
                if(this.baseSet.has(i)){
                    const index = this.base.indexOf(i)
                    text += '(' + this.variables[i - 1] + ': ' + (this.body[index][0].s*this.body[index][0].n/this.body[index][0].d).toString() + '), \n';
                }
                else
                    text += '(' + this.variables[i - 1] + ': 0), \n';
            }            
            const x = xValue.s*xValue.n/xValue.d
            const y = yValue.s*yValue.n/yValue.d
            if(this.datas[this.datas.length - 2].x[this.datas[this.datas.length - 2].x.length - 1] != x || this.datas[this.datas.length - 2].y[this.datas[this.datas.length - 2].y.length - 1] != y){
                this.datas[this.datas.length - 2].x.push(x);
                this.datas[this.datas.length - 2].y.push(y);
            }
            this.datas[this.datas.length - 1].x.push(x);
            this.datas[this.datas.length - 1].y.push(y);
            this.datas[this.datas.length - 1].text.push(text);
            Plotly.redraw('graph');
        }
    }


    resizeGraph(){
        if(this.dimensions == 2)
            if(window.innerWidth > 900){
                this.layout.height = 0.3375*window.innerWidth;
                this.layout.width = 0.9*window.innerWidth;
                Plotly.redraw('graph');
            }
            else{
                this.layout.height = 303.75;
                this.layout.width = 810;
                Plotly.redraw('graph');
            }
    }
}