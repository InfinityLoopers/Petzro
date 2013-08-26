
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var mongodb = require('mongodb');
var server = new mongodb.Server('localhost',27017, {auto_reconnect: true});
var db = new mongodb.Db('user_data', server);
var nodemailer = require("nodemailer");
var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",  // sets automatically host, port and connection security settings
    auth: {
        user: "itisady@gmail.com",
        pass: "iamgoodman"
    }
});





app.get('/', routes.index);
/*app.get('/Add-Admin',function(req,res){
 db.open(function(err, db) {
 if(!err) {
 db.collection("project", function(err, collection) {
 var myUser={};
 myUser._id=1;
 myUser.fname="Usama";
 myUser.lname="Noman";
 myUser.email="k112119@nu.edu.pk";
 myUser.password="sweetosam";
 myUser.designation="CEO";
 myUser.role="Admin";
 myUser.inbox=[];

 myUser.nav={};
 myUser.nav.AddSup="Add Supervisor";
 myUser.nav.RmvSup="Remove Supervisor";
 myUser.nav.AddEmp="Add Employee";
 myUser.nav.RmvEmp="Remove Employee";
 myUser.nav.AddPro="Add Project";
 myUser.nav.RmvPro="Remove Project";
 myUser.nav.Messages="Messages";
 myUser.nav.Notify="Notifications";
 myUser.nav.Profile="Profile";

 collection.insert(myUser, {safe : true}, function(err, result) {
 if(err) {
 console.log(err);
 } else {
 res.send(result);
 db.close();
 }
 });
 });
 }
 });
 });
*/
app.get('/Login', user.login);
app.get('/dashboard/Profile', function(req,res){
    if(req.session.setted==true){
        var cuser;
        var to_search=req.session.myid ;
        if(req.session.role =="Admin")
        to_search={_id:to_search};
        else
        to_search={_id:new mongodb.ObjectID(to_search)};

        db.open(function(err, dbs) {
            dbs.collection('project',function(err, collection) {
                //update
                collection.findOne(to_search, function(err, result) {
                    if (err) {
                        throw err;
                    } else {
                        cuser=result;
                        var theCa;
                        if(req.session.theCall!=""){
                            theCa=req.session.theCall;
                        }
                        else{
                            theCa="";
                        }
                        res.render('profile.ejs',{cu:cuser,theCall:theCa});
                    }
                    dbs.close();
                });
            });
        });

    }
    else{
        res.redirect('/');
    }
});


app.get("/dashboard/AddEmp",function(req,res){
    if(req.session.setted==true){
        if(req.session.role=="Admin"){
        res.render('addEmp.ejs',{role:req.session.role});
        }
        else if(req.session.role=="Supervisor"){
            db.open(function(err, dbs) {
                dbs.collection('project',function(err, collection) {
                    collection.findOne({email:req.session.email},function(err,resultant){if(err)throw err;else{theWork=resultant.myWorkers;}});

                    collection.find().toArray(function(err, result) {
                        if (err) {
                            throw err;
                        } else {
                            var cuser=result;
                            res.render('addEmp.ejs',{cu:cuser,workers:theWork,pro:req.session.supervison,role:req.session.role});

                        }
                        dbs.close();
                    });
                });
            });
        }
    }
    else{
        res.redirect('/');
    }

});
app.post('/dashboard/AddedEmp',function(req,res){
    post_email=req.body.empEmail;
    post_title=req.body.projTitle;
    var object_to_search={email:post_email};
    var object_to_search2={title:post_title};

    db.open(function(err, db) {
        if(!err) {
            db.collection("project", function(err, collection) {
                collection.findOne(object_to_search,function(err, result) {
                    if(err) {
                        throw err;
                    } else {

                        result.emplovision.push(post_title);
                        collection.save(result);
                        collection.findOne({email:req.session.email},function(err,result){
                            if(err)throw err;
                            else{
                                var Worker={"Email":post_email,"Project":post_title };
                                result.myWorkers.push(Worker);

                                /*Generating Notification*/
                                var message="Hi, You have been added to work on a project : "+post_title+". Please Feel Free to contact the adminstrator for information.";
                                var theNotification={"Message":message,"To":post_email,"Read":false,"From":req.session.email};
                                collection.findOne({email:post_email},function(err,result2){if(err)throw err;else{
                                    result2.inbox.push(theNotification);
                                }});



                                /*Ending Generating Notification*/
                                /*Generating Email*/
                                var obj={from:"itisady@gmail.com",to:"k112119@nu.edu.pk",subject:"An Employee Was Added To A Project",text:message};
                                smtpTransport.sendMail(obj, function(error, response){  //callback
                                    if(error){
                                        throw (error);
                                    }else{
                                        console.log("Message sent: " + response.message);
                                    }

                                    smtpTransport.close(); // shut down the connection pool, no more messages.  Comment this line out to continue sending emails.
                                });
                                /*Ending Generating Email*/
                                req.session.theCall="The Employer Has Been Added To The Project.";

                                collection.save(result);
                                res.redirect('dashboard/Profile');
                                db.close();
                            }
                        });

                                }


                });


            });
        }
    });
});
app.get("/Logout",function(req,res){

    req.session.destroy();
    res.redirect('/');
});
app.get('/dashboard/RmvEmp',function(req,res){
    var theWork;
    if(req.session.setted==true){
        db.open(function(err, dbs) {
            dbs.collection('project',function(err, collection) {
                collection.findOne({email:req.session.email},function(err,resultant){if(err)throw err;else{theWork=resultant.myWorkers;}});
                collection.find().toArray(function(err, result) {
                    if (err) {
                        throw err;
                    } else {
                        var cuser=result;

                        res.render('rmvEmp.ejs',{cu:cuser,workers:theWork,role:req.session.role});
                    }
                    dbs.close();
                });
            });
        });


    }
    else{
        res.redirect('/');
    }
});

app.get('/RemoveEmpFromProj/:id',function(req,res){
    var indexed=req.params.id;
    db.open(function(err, dbs) {
        dbs.collection('project',function(err, collection) {
            //update
            collection.findOne({email:req.session.email},function(err, result) {
                if (err) {
                    throw err;
                } else {
                    var cuser=result;
                    var targetEmail=cuser.myWorkers[indexed].Email;
                    var targetTitle=cuser.myWorkers[indexed].Project;
                    cuser.myWorkers.splice(indexed,1);

                    /*Generating Notification*/
                    var message="Hi, You have been removed from the working on the project : "+targetTitle+". Please Feel Free to contact the adminstrator for information.";
                    var theNotification={"Message":message,"To":targetEmail,"Read":false,"From":req.session.email};
                    //cuser.inbox.push(theNotification);
                    /*Ending Generating Notification*/


                    collection.findOne({email:post_email},function(err,result2){if(err)throw err;else{
                        result2.inbox.push(theNotification);
                        result2.emplovision.splice(index,1);
                    }});
                    /*Generating Email*/
                    var obj={from:"itisady@gmail.com",to:"k112119@nu.edu.pk",subject:"An Employee Was Removed From A Project He Was Working On",text:message};
                    smtpTransport.sendMail(obj, function(error, response){  //callback
                        if(error){
                            throw (error);
                        }else{
                            console.log("Message sent: " + response.message);
                        }

                        smtpTransport.close(); // shut down the connection pool, no more messages.  Comment this line out to continue sending emails.
                    });
                    /*Ending Generating Email*/


                    collection.save(cuser);
                    /*collection.findOne({email:targetEmail},function(err,resultreturned){if(err)throw err;else{
                        resultreturned.emplovision.forEach(function(item){
                            if(item==targetTitle){
                                res.send("Font");
                            }
                        })
                    }});
                    */
                    req.session.theCall="The User Has Been Removed From The Project.";
                    res.redirect('dashboard/Profile');
                }
                dbs.close();
            });
        });
    });

});

app.get('/dashboard/RmvPro',function(req,res){
    if(req.session.setted==true){
        db.open(function(err, dbs) {
            dbs.collection('projects',function(err, collection) {
                //update
                collection.find().toArray(function(err, result) {
                    if (err) {
                        throw err;
                    } else {
                        var cuser=result;

                        //res.send(cuser);
                        res.render('rmvPro.ejs',{cu:cuser,role:req.session.role});
                    }
                    dbs.close();
                });
            });
        });


    }
    else{
        res.redirect('/');
    }
});

app.get('/AboutUs',function(req,res){
    res.render('AboutUS.ejs');
});

app.get('/dashboard/RmvPro/:id',function(req,res){
    //res.send(obj_to_search);
    db.open(function(err, dbs) {
        if(!err) {
            dbs.collection('projects',function(err, collection) {
//update
                collection.remove({_id:new mongodb.ObjectID(req.params.id)},
                    function(err, result) {
                        if (err) {
                            throw err;
                        } else {

                            var message="Hello Admin, You one of the project from the firm was removed." ;
                            /*Generating Email*/
                            var obj={from:"itisady@gmail.com",to:"k112119@nu.edu.pk",subject:"A project was removed.",text:message};
                            smtpTransport.sendMail(obj, function(error, response){  //callback
                                if(error){
                                    throw (error);
                                }else{
                                    console.log("Message sent: " + response.message);
                                }

                                smtpTransport.close(); // shut down the connection pool, no more messages.  Comment this line out to continue sending emails.
                            });
                            /*Ending Generating Email*/

                            req.session.theCall="The Project Has Been Removed.";
                            req.session.setted=req.session.setted || true;
                            res.redirect("/dashboard/Profile");
                        }
                        dbs.close();
                    });
            });
        }
    });
});

app.get('/ContactUS',function(req,res){
    res.render('ContactUS.ejs');
});
app.post('/ContactUS',function(req,res){
    var EmailSub=req.body.personEmail;
    var MessageSub=req.body.description;
    var subject="General Query";
    /*Generating Notification*/
    var message="Hello Admin, You recieved a message through contact form message was: "+MessageSub;
    var theNotification={"Message":message,"To":"k112119@nu.edu.pk","Read":false,"From":EmailSub};
    db.open(function(err,db){
        db.collection("project",function(err,collection){
            if(err) throw err;
            else{
                collection.findOne({email:EmailSub},function(err,result){
                    if(err) throw err;
                    else{
                        result.inbox.push(theNotification);
                        collection.save(result);

                        res.redirect("/ContactUS");
                    }
                    db.close();
                });
            }
        })
    });
    /*Ending Generating Notification*/
    /*Generating Email*/
    var obj={from:"itisady@gmail.com",to:"k112119@nu.edu.pk",subject:"A Message through contact form.",text:message};
    smtpTransport.sendMail(obj, function(error, response){  //callback
        if(error){
            throw (error);
        }else{
            console.log("Message sent: " + response.message);
        }

        smtpTransport.close(); // shut down the connection pool, no more messages.  Comment this line out to continue sending emails.
    });
    /*Ending Generating Email*/

});

app.get('/dashboard/MyProjects',function(req,res){
    var proj;
    if(req.session.setted==true){
        db.open(function(err, dbs) {

            dbs.collection('project',function(err, collection) {
                //update
                collection.findOne({email:req.session.email},function(err, result) {
                    if (err) {
                        throw err;
                    } else {
                        proj=result;

                        res.render('myProjects.ejs',{pro:proj,role:req.session.role});

                    }
                    dbs.close();
                });
            });


        });
    }
    else{
        res.redirect('/');
    }
});

app.get('/dashboard/RmvSup',function(req,res){
    if(req.session.setted==true){
        var proj;
        db.open(function(err, dbs) {

                        dbs.collection('projects',function(err, collection) {
                            //update
                            collection.find().toArray(function(err, result) {
                                if (err) {
                                    throw err;
                                } else {
                                    proj=result;
                                    res.render('rmvSup.ejs',{pro:proj,role:req.session.role});

                                }
                                dbs.close();
                            });
                        });


        });


    }
    else
    {
        res.redirect("/")
    }
});


app.get('/MarkAsRead/:index',function(req,res){
    var indexToRead=req.params.index;
    db.open(function(err, dbs) {
        dbs.collection('project',function(err, collection) {
            //update
            collection.findOne({email:req.session.email},function(err, result) {
                if (err) {
                    throw err;
                } else {
                    result.inbox[indexToRead].Read=true;
                    collection.save(result);
                    req.session.theCall="The Message was marked as read.";
                    res.redirect('/dashboard/Profile');
                    dbs.close();


                }

            });
        });
    });
});
app.get('/DeleteMessage/:index',function(req,res){
    var indexToRead=req.params.index;
    db.open(function(err, dbs) {
        dbs.collection('project',function(err, collection) {
            //update
            collection.findOne({email:req.session.email},function(err, result) {
                if (err) {
                    throw err;
                } else {
                    /*Generating Notification*/
                    var message="Hi, You tried to delete a message which was successfully removed. We are hoping that the message deleted was: "+result.inbox[indexToRead].Message;
                    var obj={from:"itisady@gmail.com",to:"k112119@nu.edu.pk",subject:"Message Was Deleted",text:message};
                    smtpTransport.sendMail(obj, function(error, response){  //callback
                        if(error){
                            throw (error);
                        }else{
                            console.log("Message sent: " + response.message);
                        }

                        smtpTransport.close(); // shut down the connection pool, no more messages.  Comment this line out to continue sending emails.
                    });
                    /*Ending Generating Email*/

                    result.inbox.splice(indexToRead,1);
                    collection.save(result);
                    req.session.the="The Message was Deleted Successfully.";
                    res.redirect('/dashboard/Profile');
                    dbs.close();


                }

            });
        });
    });
});
app.get('/dashboard/Notify',function(req,res){
    if(req.session.setted==true){
        var cuser;
        db.open(function(err, dbs) {
            dbs.collection('project',function(err, collection) {
                //update
                collection.findOne({email:req.session.email},function(err, result) {
                    if (err) {
                        throw err;
                    } else {
                        cuser=result;
                        res.render('Notify.ejs',{cu:cuser});

                        dbs.close();


                    }

                });
            });
        });
    }
    else
    {
        res.redirect("/")
    }
});

app.get('/dashboard/Messages',function(req,res){
    if(req.session.setted==true){
        var cuser;
        db.open(function(err, dbs) {
            dbs.collection('project',function(err, collection) {
                //update
                collection.find().toArray(function(err, result) {
                    if (err) {
                        throw err;
                    } else {
                        cuser=result;
                        res.render('Msg.ejs',{cu:cuser,role:req.session.role});

                        dbs.close();


                    }

                });
            });
        });
    }
    else
    {
        res.redirect("/")
    }
});

app.post('/dashboard/SentMessage',function(req,res){
    var message=req.body.description;
    var email=req.body.personEmail;
    var from=req.session.email;

    var theNotification={"Message":message,"To":email,"Read":false,"From":from};
    db.open(function(err, db) {
        if(!err) {
            db.collection("project", function(err, collection) {
                collection.findOne({"email":email},function(err, result) {
                    if(err) {
                        throw err;
                    } else {
                        /*Generating Email*/
                        var obj={from:"itisady@gmail.com",to:"k112119@nu.edu.pk",subject:"You have new message recieved",text:message};
                        smtpTransport.sendMail(obj, function(error, response){  //callback
                            if(error){
                                throw (error);
                            }else{
                                console.log("Message sent: " + response.message);
                            }

                            smtpTransport.close(); // shut down the connection pool, no more messages.  Comment this line out to continue sending emails.
                        });
                        /*Ending Generating Email*/

                        result.inbox.push(theNotification);
                        collection.save(result);
                        req.session.theCall="The Message was sent successfully.";
                        res.redirect('/dashboard/Profile');
                        db.close();


                    }
                });

            });
        }
    });


});
app.get('/dashboard/AddSup',function(req,res){
    if(req.session.setted==true){
        var cuser;
        var proj;
        db.open(function(err, dbs) {
            dbs.collection('project',function(err, collection) {
                //update
                collection.find().toArray(function(err, result) {
                    if (err) {
                        throw err;
                    } else {
                        cuser=result;
                        dbs.collection('projects',function(err, collection) {
                                //update
                                collection.find().toArray(function(err, result) {
                                    if (err) {
                                        throw err;
                                    } else {
                                        proj=result;
                                        res.render('addSup.ejs',{cu:cuser,pro:proj,role:req.session.role});

                                    }
                                    dbs.close();
                                });
                        });

                    }

                });
            });
        });






    }
    else
    {
        res.redirect("/")
    }
});

app.get('/dashboard/RmvEmp/:id',function(req,res){
    var to_update=parseInt(req.params.id, 10);
    obj_to_search={_id:to_update};
    //res.send(obj_to_search);
    db.open(function(err, dbs) {
        if(!err) {
            dbs.collection('project',function(err, collection) {
//update
                collection.remove({_id:new mongodb.ObjectID(req.params.id)},
                    function(err, result) {
                        if (err) {
                            throw err;
                        } else {
                            /*Generating Email*/
                            var message="Hi, You have been removed from the firm. You can always come and ask for the reason and discuss what happened with you. Please feel free to contact back the administrator and Good luck for your future.";
                            var obj={from:"itisady@gmail.com",to:"k112119@nu.edu.pk",subject:"You have been removed from the firm",text:message};
                            smtpTransport.sendMail(obj, function(error, response){  //callback
                                if(error){
                                    throw (error);
                                }else{
                                    console.log("Message sent: " + response.message);
                                }

                                smtpTransport.close(); // shut down the connection pool, no more messages.  Comment this line out to continue sending emails.
                            });
                            /*Ending Generating Email*/
                            req.session.theCall="The Employer was removed successfully.";
                            req.session.setted=req.session.setted || true;
                            res.redirect("/dashboard/Profile");
                        }
                        dbs.close();
                    });
            });
        }
    });
});





app.get('/dashboard/AddPro',function(req,res){
    if(req.session.setted==true){
        res.render('addPro.ejs',{role:req.session.role});
        /*db.open(function(err, dbs) {
         dbs.collection('projects',function(err, collection) {
         //update
         collection.insert(user, {safe : true}, function(err, result) {
         if(err) {
         res.send(err);
         } else {
         res.redirect("/dashboard/Profile");
         //close database
         db.close();
         }
         });

         });
         });*/


    }
    else{
        res.redirect('/');
    }
});

app.post('/dashboard/RmvedSup',function(req,res){
    post_email=req.body.supEmail;
    post_title=req.body.projTitle;
    var object_to_search={email:post_email};
    var object_to_search2={title:post_title};

    db.open(function(err, db) {
        if(!err) {
            db.collection("project", function(err, collection) {
                collection.findOne(object_to_search,function(err, result) {
                    if(err) {
                        throw err;
                    } else {
                        result.role="Employee";
                        result.supervison=[];

                        db.collection("projects", function(err, collection2) {
                            collection2.findOne(object_to_search2,function(err,result2) {
                                if(err) {
                                    throw err;
                                } else {
                                    result2.supervisorName=null;
                                    result2.supervisorEmail=null;
                                    collection2.save(result2);
                                    /*Generating Notification*/
                                    var message="Hi, You have been removed from the position of the supervisor of the project "+post_title+" . You can always login and message the adminstrator to find out what actually happened.";
                                    var theNotification={"Message":message,"To":post_email,"Read":false,"From":req.session.email};
                                    result.inbox.push(theNotification);
                                    collection.save(result);
                                    /*Ending Generating Notification*/
                                    /*Generating Email*/
                                    var obj={from:"itisady@gmail.com",to:"k112119@nu.edu.pk",subject:"You Have Been Removed From Supervision",text:message};
                                    smtpTransport.sendMail(obj, function(error, response){  //callback
                                        if(error){
                                            throw (error);
                                        }else{
                                            console.log("Message sent: " + response.message);
                                        }

                                        smtpTransport.close(); // shut down the connection pool, no more messages.  Comment this line out to continue sending emails.
                                    });
                                    /*Ending Generating Email*/
                                    req.session.theCall="The supervisor was successfully removed from the project.";
                                    res.redirect('dashboard/Profile');

                                    db.close();
                                }
                            });

                        });

                    }
                });





            });
        }
    });

});

app.post('/dashboard/AddedSup',function(req,res){
    post_email=req.body.supEmail;
    post_title=req.body.projTitle;
    var object_to_search={email:post_email};
    var object_to_search2={title:post_title};

    db.open(function(err, db) {
        if(!err) {
            db.collection("project", function(err, collection) {
                collection.findOne(object_to_search,function(err, result) {
                    if(err) {
                        throw err;
                    } else {

                        db.collection("projects", function(err, collection2) {
                            collection2.findOne(object_to_search2,function(err,result2) {
                                if(err) {
                                    throw err;
                                } else {
                                    result.role="Supervisor";
                                    result2.supervisorName=result.fname;
                                    result2.supervisorEmail=result.email;
                                    result.supervison.push(result2.title);
                                    collection2.save(result2);
                                    /*Generating Notification*/
                                    var message="Hi, Congratulation you have became project supervisor of a project, named:"+post_title+". We are looking for a good and positive response from you on this project. Keep it up.!";
                                    var theNotification={"Message":message,"To":post_email,"Read":false,"From":"k112119@nu.edu.pk"};
                                    result.inbox.push(theNotification);
                                    collection.save(result);
                                    /*Ending Generating Notification*/
                                    /*Generating Email*/
                                    var obj={from:"itisady@gmail.com",to:"k112119@nu.edu.pk",subject:"You Have Became Supervisor Of A Project",text:message};
                                    smtpTransport.sendMail(obj, function(error, response){  //callback
                                        if(error){
                                            throw (error);
                                        }else{
                                            console.log("Message sent: " + response.message);
                                        }

                                        smtpTransport.close(); // shut down the connection pool, no more messages.  Comment this line out to continue sending emails.
                                    });
                                    /*Ending Generating Email*/
                                    req.session.theCall="The Supervisor was successfully added to the group.";
                                    res.redirect('dashboard/Profile');

                                    db.close();
                                }
                            });

                        });

                            }
                        });





            });
        }
    });

});








app.post('/dashboard/profile/add/project',function(req,res){
    var title=req.body.title;
    var Type=req.body.type,
        Budget=req.body.budget,
        Technologies=req.body.technologies,
        Complex=req.body.complex,
        Ppl=req.body.ppl,
        RefLinks=req.body.refLinks,
        Description=req.body.description;
        var Duration=req.body.duration;



    var project={};
    project.title=title;
    project.Type=Type;
    project.Budget=Budget;
    project.Technologies=Technologies;
    project.Complex=Complex;
    project.Ppl=Ppl;
    project.RefLinks=RefLinks;
    project.Description=Description;
    project.Duration=Duration;




    db.open(function(err, dbs) {
        if(!err) {
            dbs.collection('projects',function(err, collection) {
//update
                collection.insert(project, {safe : true}, function(err, result) {
                    if(err) {
                        res.send(err);
                    } else {
                        //res.send(result);
                        req.session.setted=req.session.setted || true;
                        /*Generating Notification*/
                        var message="Hi, Congratulation you have added a new project in your system, named:"+project.title+". We are looking for a good and positive response from your company";
                        /*Generating Email*/
                        var obj={from:"itisady@gmail.com",to:"k112119@nu.edu.pk",subject:"You Have Added A New Project",text:message};
                        smtpTransport.sendMail(obj, function(error, response){  //callback
                            if(error){
                                throw (error);
                            }else{
                                console.log("Message sent: " + response.message);
                            }

                            smtpTransport.close(); // shut down the connection pool, no more messages.  Comment this line out to continue sending emails.
                        });
                        /*Ending Generating Email*/
                        req.session.theCall="The Project was successfully added.";
                        res.redirect("/dashboard/Profile");
//close database
                        db.close();
                    }
                });
            });
        }
    });
});
app.post('/dashboard/profile/update/:id',function(req,res){
    var to_update=req.params.id;
    var firstName=req.body.fname,
        submittedDesignation=req.body.designation,
        submittedPwd=req.body.password,
        submittedEmail=req.body.email,
        lastName=req.body.lname;

    to_update=parseInt(to_update, 10);
    obj_to_search={_id:to_update};
    db.open(function(err, dbs) {
        if(!err) {
            dbs.collection('project',function(err, collection) {
//update
                collection.update(obj_to_search,{$set : {fname: firstName,lname:lastName,email:submittedEmail,password:submittedPwd,designation:submittedDesignation}},{safe: true},
                    function(err, result) {
                        if (err) {
                            throw err;
                        } else {
                            req.session.myid=to_update;
                            req.session.setted=req.session.setted || true;
                            req.session.theCall="The profile was successfully updated.";
                            res.redirect("/dashboard/Profile");
                        }
                        dbs.close();
                    });
            });
        }
    });
});
app.post('/Login',function(req,res){
    post_pass=req.body.password;
    post_email=req.body.email;
    var object_to_search={password:post_pass};


    db.open(function(err, db) {
        if(!err) {
            db.collection("project", function(err, collection) {
                collection.findOne(object_to_search,function(err, result) {
                    if(err) {
                        throw err;
                    } else {

                        if(result.email==post_email){
                            req.session.fname=req.session.fname || result.fname;
                            req.session.myid=req.session.myid || result._id;
                            req.session.lname=req.session.lname || result.lname;
                            req.session.email=req.session.email || result.email;
                            req.session.password=req.session.password || result.password;
                            req.session.role=req.session.role || result.role;
                            req.session.designation=req.session.designation|| result.designation;
                            req.session.nav=req.session.nav || result.nav;
                            req.session.setted=true;
                            if(result.role!="Admin"){
                                req.session.skill=req.session.skill|| result.skill;
                                req.session.skills=req.session.skills|| result.skills;
                                req.session.interest=req.session.interest|| result.interest;

                                req.session.expert=req.session.expert|| result.experience;
                                req.session.education=req.session.education|| result.education;
                                req.session.supervison=req.session.supervison|| result.supervison;
                                req.session.emplovision=req.session.emplovision|| result.emplovision;
                                req.session.myWorkers=req.session.myWorkers|| result.myWorkers;



                            }
                            res.redirect('/dashboard/Profile');
                        }
                        else{
                            res.send("Record Not Find");
                        }
                        db.close();
                    }
                });

            });
        }
    });
});

app.post('/dashboard/profile/add/employee',function(req,res){
    var Experience=req.body.exp;
    var firstName=req.body.fname,
        submittedDesignation=req.body.designation,
        submittedPwd=req.body.password,
        submittedEmail=req.body.email,
        lastName=req.body.lname,
        Education=req.body.edu,
        MajorSkills=req.body.skill,
        OtherSkills=req.body.skillsset,
        Interest=req.body.interestset;


    var user={};
    user.fname=firstName;
    user.lname=lastName;
    user.designation=submittedDesignation;
    user.email=submittedEmail;
    user.password=submittedPwd;
    user.skill=MajorSkills;
    user.experience=Experience;
    user.education=Education;
    user.skills=OtherSkills;
    user.interest=Interest;
    user.supervison=[];
    user.emplovision=[];
    user.inbox=[];
    user.myWorkers=[];

    var message="Hi, Congratulation you have been added In The Petzro firm.!. Feel free to enjoy the lovely working environment.";
    var theNotification={"Message":message,"To":user.email,"Read":false,"From":req.session.email};
    user.inbox.push(theNotification);




    db.open(function(err, dbs) {
        if(!err) {
            dbs.collection('project',function(err, collection) {
//update
                user.role="Employee";
                collection.insert(user, {safe : true}, function(err, result) {
                    if(err) {
                        throw (err);
                    } else {
                        /*Generating Email*/
                        var obj={from:"itisady@gmail.com",to:"k112119@nu.edu.pk",subject:"You Have Been Added As Employee In Petzro",text:message};
                        smtpTransport.sendMail(obj, function(error, response){  //callback
                            if(error){
                                throw (error);
                            }else{
                                console.log("Message sent: " + response.message);
                            }

                            smtpTransport.close(); // shut down the connection pool, no more messages.  Comment this line out to continue sending emails.
                        });
                        /*Ending Generating Email*/
                        req.session.theCall="The Employee was successfully added.";
                        res.redirect("/dashboard/Profile");
//close database
                        db.close();
                    }
                });
            });
        }
    });
});
http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});
