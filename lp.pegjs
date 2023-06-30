{
function formType(type){
  return type[1] == 'a' ? true : false; 
}

function formExpression(t, op, e){
  if(op == '+')
    return [t].concat(e);
  e[0][0] = -e[0][0];
  return [t].concat(e);
}

function formFloating(s, f, decimal){
  if(s == null)
    return parseFloat((f+'.'+decimal).replaceAll(',', ''), 10);
  return parseFloat((s+f+'.'+decimal).replaceAll(',', ''), 10);;
}

function formInteger(s, i){
  if(s==null)
    return parseInt((''+i).replaceAll(',', ''), 10);
  return parseInt((s+i).replaceAll(',', ''), 10);
}

function signToInt(s){
  switch(s){
    case '=':
      return 0;
    case '<=':
      return 1;
    case '>=':
      return 2;
  }
}

function formBound1(v, n1, n2, b){
  if(b == null)
    return [[v, 2, n1], [v, 1, n2]];
  return [[v, 2, n1], [v, 1, n2]].concat(b);
}

function formBound2(v, s, n, b){
  if(b == null)
    return [[v, s, n]];
  return [[v, s, n]].concat(b);
}

function formGenerals(v, g){
  if(g == null)
    return [v];
  return [v].concat(g);
}
}

start = type:('Maximize'/'Minimize') spacing fobj:objective spacing 'Subject ' spacing 'To' r:restriction+ b:bounds? g:generals? spacing 'End'? spacing {return [formType(type), fobj, r, b, g];}

spacing = (' '/'\b'/'\f'/'\n'/'\r'/'\t'/'\v')*

objective = v:variable spacing '=' spacing e:expression                             {return [v, e, 0];}
  / e:expression                                                                    {return [null, e, 0];}

restriction = spacing v:variable spacing ':' spacing e:expression spacing s:('='/'<='/'>=') spacing n:number  {return [v, e, signToInt(s), n];}

expression = spacing t:term spacing op:('+'/'-') spacing e:expression               {return formExpression(t, op, e);}
  / spacing t:term                                                                  {return [t];}

bounds = spacing 'Bounds' b:bound                                                   {return b;}

bound = spacing n1:number spacing '<=' spacing v:variable spacing '<=' spacing n2:number b:bound?   {return formBound1(v, n1, n2, b);}
  / spacing v:variable spacing s:('<='/'>=') spacing n:number b:bound?                              {return formBound2(v, signToInt(s), n, b);}

generals = spacing 'Generals' spacing v:variable g:general*                         {return formGenerals(v, g);}

general = (' '/'\b'/'\f'/'\n'/'\r'/'\t'/'\v') spacing v:variable                    {return v;}

term = n:number v:variable?                                                         {return [n, v];}
  / '-' spacing v:variable                                                          {return [-1, v];}
  / v:variable                                                                      {return [1, v];}

number = floating
  / n:integer

floating = s:'-'? '0' '.' decimal:[0-9]+                                            {return formFloating(s, '0', decimal);}
  / s:'-'? f:([1-9][0-9]*) '.' decimal:[0-9]+                                       {return formFloating(s, f, decimal);}

integer 'integer' = '0'                                                             {return 0;}
  / s:'-'? i:[0-9]+                                                                 {return formInteger(s, i);}

variable = v:([a-z][0-9]*)                                                          {return (''+v).replaceAll(',', '');}