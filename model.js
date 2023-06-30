export class Model{
    constructor(matrix){
        this.type = matrix[0];
        this.variables = new Set();
        this.variablesPosition = new Map();
        this.countExpressions = matrix[2].length + (matrix[3] != null ? matrix[3].length : 0) + 1;
        this.base = Array(this.countExpressions).fill(null);
        this.baseSet = new Set();


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
        const main = document.getElementById('main');
        let dictionary = document.getElementById('dictionary');
        dictionary.remove();
        dictionary = document.createElement('div');
        dictionary.id = 'dictionary';
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
                if(i != 0){
                    const button = document.createElement('button');
                    button.id = 'E' + variable;
                    button.classList.add('variableOut');
                    button.value = [this.base[i], false];
                    button.appendChild(document.createTextNode(variable[0]));
                    if(variable.length > 1){
                        const sub = document.createElement('sub');
                        sub.appendChild(document.createTextNode(variable.substring(1)));
                        sub.style.fontSize = '50%';
                        button.appendChild(sub);
                    }
                    element.appendChild(button);
                }
                else{
                    element.appendChild(document.createTextNode(variable[0]));
                    if(variable.length > 1){
                        const sub = document.createElement('sub');
                        sub.appendChild(document.createTextNode(variable.substring(1)));
                        sub.style.fontSize = '50%';
                        element.appendChild(sub);
                    }
                }                
                symbol.appendChild(document.createTextNode('='))
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
                        if(this.body[i][j].d != 1){
                            const math = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math');
                            const mfrac = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'mfrac');
                            const min = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'mi');
                            min.appendChild(document.createTextNode(this.body[i][j].n.toString()));
                            const mid = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'mi');                        
                            mid.appendChild(document.createTextNode(this.body[i][j].d.toString()));
                            mfrac.appendChild(min);
                            mfrac.appendChild(mid);
                            math.appendChild(mfrac);
                            element.appendChild(math);
                        }
                        else if(j == 0 || this.body[i][j].n != 1)
                            element.appendChild(document.createTextNode(this.body[i][j].n.toString()));
                        if(j > 0){
                            const variable = this.variables[j - 1];
                            if(i == 0){
                                const button = document.createElement('button');
                                button.id = variable;
                                button.classList.add('variableIn');
                                button.value = j;
                                button.appendChild(document.createTextNode(variable[0]));
                                if(variable.length > 1){
                                    const sub = document.createElement('sub');
                                    sub.appendChild(document.createTextNode(variable.substring(1)));
                                    sub.style.fontSize = '50%';
                                    button.appendChild(sub);
                                }
                                element.appendChild(button);
                            }
                            else{
                                element.appendChild(document.createTextNode(variable[0]));
                                if(variable.length > 1){
                                    const sub = document.createElement('sub');
                                    sub.appendChild(document.createTextNode(variable.substring(1)));
                                    sub.style.fontSize = '50%';
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
        main.appendChild(dictionary);
    }


    showLimits(variableIndex){
        while(true){
            const limit = document.querySelector('.limit');
            if(limit == null)
                break;
            limit.remove();
        }
        const variable = this.variables[variableIndex - 1];
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
                        sub.style.fontSize = '50%';
                        element.appendChild(sub);
                    }
                    if(this.body[i][variableIndex].s == -1){
                        element.appendChild(document.createTextNode('<='));
                        const limit = math.multiply(math.fraction('-1'), math.divide(this.body[i][0], this.body[i][variableIndex]));
                        if(limit.s == -1)
                            element.appendChild(document.createTextNode('-'));
                        if(limit.d == 1)
                            element.appendChild(document.createTextNode(limit.n.toString()));
                        else{
                            const math = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math');
                            const mfrac = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'mfrac');
                            const min = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'mi');
                            min.appendChild(document.createTextNode(limit.n.toString()));
                            const mid = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'mi');                        
                            mid.appendChild(document.createTextNode(limit.d.toString()));
                            mfrac.appendChild(min);
                            mfrac.appendChild(mid);
                            math.appendChild(mfrac);
                            element.appendChild(math);
                        }
                    }
                    else
                        element.appendChild(document.createTextNode(' É ILIMITADO'));
                    row.appendChild(element);                    
                    button.value = [button.value.substring(0, button.value.indexOf(',')), true];
                }
                else
                    button.value = [button.value.substring(0, button.value.indexOf(',')), false];
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
        this.createTable();
    }
}