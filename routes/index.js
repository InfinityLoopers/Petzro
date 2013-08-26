
/*
 * GET home page.
 */

exports.index = function(req, res){
    var sess;
  if(req.session.setted==true){
      sess=true;
  }
  else
  {
      sess=false;
  }

  res.render('index.ejs', { sessionsetted: sess });
};

exports.project = function(req, res){
    res.render('others/project', { title: 'Express',TheName:req.session.fname });
};

exports.assignment = function(req, res){
    res.render('others/assignment', { title: 'Express' });
};
