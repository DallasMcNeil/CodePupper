var Discordie = require("discordie");
var spawn = require('child_process').spawn;
var fs = require('fs');
var https = require('https');

var client = new Discordie();

// Insert your bots token
client.connect({ token: "YOUR_TOKEN_HERE" });

const codeTimeout = 5 // In seconds
const inputRefresh = 100 // In milliseconds

var help = `Henlo fren! I can run code for u!
>c 'C code' : Will do a compile and run for you pal.
>cpp 'C++ code' : ++ better than C.
>js 'Javascript code' : Smells like home.
>lua 'Lua code' : Do a howl at the moon.
>py 'Python code' : My snek fren will halp you.
>swift 'Swift code' : Very fast compile and run at incredible high speed.

>i'language' ['input0','input1',...,'inputn'] 'code'
Ur program does an input?, do a specify before you run it. Prefix ur command with 'i' and append an array of values which will be inputed one by one by one.
e.g >iswift [CodePupper,1] var name = readLine(); var age = readLine(); print("Hello \(name)! You are \(age)!")
Output will be 'Hello CodePupper! You are 1!'

>fsave 'Catagory' 'Name' : Give me last posted file under the specified catagory as name. Another file for my collection.
>fshow 'Catagory' 'Name' : Run off and bring back the file of that name in that catagory.
>fdelete 'Catagory' 'Name' : Go and Bury file with that name in that catagory somewhere that I'll probably forget.
>frand 'Catagory' : Bring a random file in the catagory to you.
>flist 'Catagory' : Let you have a look at all files in that catagory. No touching.
>fclist : Let you have a look at all catagories.

>bork : Bork!
>pupper : Rare picture of admin.

Remember pal, with great power comes great responsibility. Don't be doin anything malicious.
`
var error = "This error is doin me a frighten!"
var inputError = "Heck! ur command is incorrectly formatted."

client.Dispatcher.on("GATEWAY_READY", e => {
    console.log("Connected as: " + client.User.username);
    client.User.setGame('>help for halp');
});

client.Dispatcher.on("MESSAGE_UPDATE", e => {
    handleMessage(e)
})

client.Dispatcher.on("MESSAGE_CREATE", e => {
    handleMessage(e)
})

var lastImageURL = ""
var lastImageType = ""
    
function handleMessage(e) {
    var message = e.message.content
    if (e.message.attachments.length > 0) {
        lastImageURL = e.message.attachments[e.message.attachments.length-1].url
        var filename = e.message.attachments[e.message.attachments.length-1].filename.split("\.")
        lastImageType = filename[filename.length-1]
    }
    
    if (message[0] == ">") {
        var command = message.substring(1)
        var hasInput = false
        if (command[0] == "i") {
            hasInput = true
            command = command.substring(1)
        }
        if (command.startsWith("help")) {
            e.message.channel.sendMessage("```"+help+"```");
        } else if (message.startsWith(">fshow ")) {
            var comps = extractCatagory(message.substr(7))
            if (validateComps(comps,2,e)) {
                checkFile(comps[1],"files/"+comps[0],false,(res) => {
                    if (res != "") {
                        e.message.channel.uploadFile("files/"+comps[0]+"/"+res);   
                        return;
                    } else {    
                        e.message.channel.sendMessage("File not doin an exist"); 
            }  
                })
            } else {    
                e.message.channel.sendMessage("File not doin an exist"); 
            }  
        } else if (message.startsWith(">fsave ")) {
            var comps = extractCatagory(message.substr(7))
            if (validateComps(comps,2,e)) {
                if (lastImageURL == "") {
                    e.message.channel.sendMessage("Wot file? Upload something first fren");      
                    return;
                }
                handleFolder("files/"+comps[0])
                checkFile(comps[1],"files/"+comps[0],true,(n) => {
                    var file = fs.createWriteStream("files/"+comps[0]+"/"+comps[1]+"."+lastImageType);
                    var request = https.get(lastImageURL, function(response) {
                        response.pipe(file);
                        e.message.channel.sendMessage("File done a save");   
                    })  
                })
            }
        } else if (message.startsWith(">fdelete ")) {
            var comps = extractCatagory(message.substr(9))
            if (validateComps(comps,2,e)) {
                checkFile(comps[1],"files/"+comps[0],true,(res) => {
                    deleteDirIfEmpty("files/"+comps[0])
                    if (res != "") {
                        e.message.channel.sendMessage("Deleeted");      
                    } else {
                        e.message.channel.sendMessage("Can't do a delet if it doesn't exist");
                    }
                    
                })
            }
        } else if (message.startsWith(">frand ")) {
            var comps = extractCatagory(message.substr(7))
            if (validateComps(comps,1,e)) {
                randomFile("files/"+comps[0],(res) => {
                    if (res != "") {
                        e.message.channel.uploadFile("files/"+comps[0]+"/"+res);   
                        return;
                    } else {    
                        e.message.channel.sendMessage("Catagory not doin an exist"); 
                    }  
                })
            } else {    
                e.message.channel.sendMessage("File not doin an exist"); 
            }  
        } else if (message.startsWith(">flist ")) {
            var comps = extractCatagory(message.substr(7))
            if (validateComps(comps,1,e)) {
                getFiles("files/"+comps[0],(str) => {
                    e.message.channel.sendMessage(str);
                })
            }
        } else if (message.startsWith(">fclist")) {
            getDir((str) => {
                e.message.channel.sendMessage(str);
            })
        } else if (command.startsWith("bork")) {
            e.message.channel.sendMessage("**Bork!**");
        } else if (command.startsWith("pupper")) {
            e.message.channel.uploadFile("admin.png");
        } else if (command.startsWith("cpp ")) {
            var code = command.substring(3)
            var input = []
            if (hasInput) {
                var results = extractInput(code)
                input = results.input
                code = results.code
                if (results.error) {
                    e.message.channel.sendMessage(inputError)
                    return;
                }
            }
            writeToFile("cpp.cpp",code,() =>{     
                runProcess("g++",["-o","code/cpp","code/cpp.cpp"],e,true,[],(out,err) => {
                    if (err != "") {
                        e.message.channel.sendMessage(error+"\n```"+err+"```");
                    } else {
                        runProcess("code/cpp",[],e,false,input,(out,err) => {})
                    }
                })
            })
        } else if (command.startsWith("c ")) {
            var code = command.substring(1)
            var input = []
            if (hasInput) {
                var results = extractInput(code)
                input = results.input
                code = results.code
                if (results.error) {
                    e.message.channel.sendMessage(inputError)
                    return;
                }
            }
            writeToFile("c.c",code,() =>{     
                runProcess("gcc",["-o","code/c","code/c.c"],e,true,[],(out,err) => {
                    if (err != "") {
                        e.message.channel.sendMessage(error+"\n```"+err+"```");
                    } else {
                        runProcess("code/c",[],e,false,input,(out,err) => {})
                    }
                })
            })
        } else if (command.startsWith("js ")) {
            var code = command.substring(2)
            var input = []
            if (hasInput) {
                var results = extractInput(code)
                input = results.input
                code = results.code
                if (results.error) {
                    e.message.channel.sendMessage(inputError)
                    return;
                }
            }
            writeToFile("js.js",code,() =>{     
                runProcess("node",["code/js.js"],e,false,input,(out,err) => {})
            })
         } else if (command.startsWith("swift ")) {
            var code = command.substring(5)
            var input = []
            if (hasInput) {
                var results = extractInput(code)
                input = results.input
                code = results.code
                if (results.error) {
                    e.message.channel.sendMessage(inputError)
                    return;
                }
            }
            writeToFile("swift.swift",code,() => {     
                runProcess("swiftc",["-o","code/swift","code/swift.swift"],e,true,[],(out,err) => {
                    if (err != "") {
                        e.message.channel.sendMessage(error+"\n```"+err+"```");
                    } else {
                        runProcess("code/swift",[],e,false,input,(out,err) => {})
                    }
                })
            })
        } else if (command.startsWith("lua ")) {
            var code = command.substring(3)
            var input = []
            if (hasInput) {
                var results = extractInput(code)
                input = results.input
                code = results.code
                if (results.error) {
                    e.message.channel.sendMessage(inputError)
                    return;
                }
            }
            writeToFile("lua.lua",code,() =>{     
                runProcess("lua",["code/lua.lua"],e,false,input,(out,err) => {})
            })
        } else if (command.startsWith("py ")) {
            var code = command.substring(2)
            var input = []
            if (hasInput) {
                var results = extractInput(code)
                input = results.input
                code = results.code
                if (results.error) {
                    e.message.channel.sendMessage(inputError)
                    return;
                }
            }
            writeToFile("py.py",code,() =>{     
                runProcess("python",["code/py.py"],e,false,input,(out,err) => {})
            })
        } else {
            e.message.channel.sendMessage("Bamboozled! I don't know that one pal. Try `>help`.");
        }
    }
}

function extractCatagory(command) {
    var comps = command.split(" ");
    if (comps.length < 1) {
        return [];
    } else if (comps.length < 2) {
        return [comps[0]];
    }
    return [comps[0],comps[1]];
}

function validateComps(comps,num,e) {
    if (comps.length < num) {
        e.message.channel.sendMessage(inputError)
        return false;
    }
    return true;
}

function handleFolder(path) {
    if (!fs.existsSync(path)) {   
        fs.mkdirSync(path);
    }
}

function checkFile(name,path,del,callback) {
    fs.readdir(path, function(err, items) {
        if (err) {
            callback("")
            return 
        }
        for (var i=0; i<items.length; i++) {
            if (items[i].split("\.")[0] == name) {
                if (del) {
                    fs.unlinkSync(path+"/"+items[i])
                }
                callback(items[i])
                return
            }
        }
        callback("")
    });
}

function deleteDirIfEmpty(path) {
    fs.readdir(path, function(err, items) {
        if (err) {
            fs.rmdir(path)
            return
        } else if (items.length == 0) {
            fs.rmdir(path)
        } else if (items[0] == ".DS_Store"&&items.length == 1) {
            fs.rmdir(path)
        }
    });
}

function getDir(callback) {
    fs.readdir("files", function(err, items) {
        if (err) {
            callback("```'No Catagories'```")
            return
        }
        if (items.length == 0) {
            callback("```'No Catagories'```")
            return
        }
        if (items[0] == ".DS_Store"&&items.length == 1) {
            callback("```'No Catagories'```")
            return
        }
        
        var str = "```\n"
        for (var i=0;i<items.length;i++) {
            if (items[i] != ".DS_Store") {
                str+=items[i]
                if (i!=items.length-1) {
                    str+="\n"
                }
            }
        }
        str+="```"
        callback(str)
    });
}

function getFiles(path,callback) {
    fs.readdir(path, function(err, items) {
        if (err) {
            callback("```'No Files'```")
            return
        }
        if (items.length == 0) {
            callback("```'No Files'```")
            return
        }
        if (items[0] == ".DS_Store"&&items.length == 1) {
            callback("```'No Files'```")
            return
        }
        
        var str = "```\n"
        for (var i=0;i<items.length;i++) {
            if (items[i] != ".DS_Store") {
                str+=items[i].split("\.")[0]
                if (i!=items.length-1) {
                    str+="\n"
                }
            }
        }
        str+="```"
        callback(str)
    });
}

function randomFile(path,callback) {
    fs.readdir(path, function(err, items) {
        if (err) {
            callback("")
            return
        }
        if (items.length == 0) {
            callback("")
            return
        }
        if (items[0] == ".DS_Store"&&items.length == 1) {
            callback("")
            return
        }
        var str = items[Math.floor(Math.random()*items.length)]
        while (str==".DS_Store") {
            str = items[Math.floor(Math.random()*items.length)]
        }
        callback(str)
    });
}

// Write code to file
function writeToFile(f,code,callback) {
    fs.writeFile("code/"+f, code, (err) => {
        if (err) {
            console.log(err);
        } else {
            callback();
        }   
    }) 
}

function extractInput(code) {
    var s = code.search("\\[")
    var f = code.search("\\]")
    if (s==-1||f==-1||f<s) {
        return {input:[],code:code,error:true}
    }  
    if (code.substr(0,s).replace("\\n","").replace(" ","") != "") {
        return {input:[],code:code,error:true}
    }
    var input = code.substring(s+1,f).split(","); 
    return {input:input,code:code.substr(f+1),error:false}
}

// Callback takes, out and err text
function runProcess(cmd,args,e,silent,input,callback) {
    var p = spawn(cmd,args)
    var err = ""
    var out = ""
    var s = silent;

    var i = 0;
    var inputID = setInterval(() => {
        if (i < input.length) {
            out+=input[i]+"\n"
            p.stdin.write(input[i]+"\n");
            i++
        } else {
            clearInterval(inputID)
        }
    },inputRefresh)
    
    var timeoutID = setTimeout(() => {
        clearTimeout(timeoutID)
        p.stdin.end();
        p.kill('SIGINT');
        e.message.channel.sendMessage("Heckin code exceeded the "+codeTimeout+"s time limit.")
        s = true;
        callback(out,err)
        return;
    },codeTimeout*1000)
    
    p.stdout.on('data', (data) => {
        out+=data
    })
                
    p.stderr.on('data', (data) => {
        err+=data
    })
    
    p.on('close', (code) => {
        clearInterval(inputID)
        clearTimeout(timeoutID)
        p.stdin.end();
        if (!s) {
            if (out != "") {
                if (out.length > 1994) {
                    for (var j = 0;j<out.length;j+=1994) {
                        var str = out.substr(j,1994)
                        e.message.channel.sendMessage("```"+str+"```");
                    }
                } else {
                    e.message.channel.sendMessage("```"+out+"```");
                }
            } else if (err != "") {
                e.message.channel.sendMessage(error+"\n```"+err+"```");
            } 
            if (out == ""&&err == "") {
                e.message.channel.sendMessage("```'No output'```")
            }
        }
        callback(out,err)
    })
}
