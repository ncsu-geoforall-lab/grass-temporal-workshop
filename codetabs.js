/*

TODO:
 * support for long flags
 * first/one parameter without option name is not supported
 * support for links to addons
 * (wouldn't be actually better if addons would be mixed with standard commands in online manual?')
 * support general tabs (requires adding a class to the pre code tabs)
 * support GUI tab which would be a general div (switch of pre?)
 * numbers in python code (is_python_number fucntion/regexp)

*/

// name of class
// visible in source code
NEUTRAL_LANG = 'neutral'
// to avoid doing this plus in other methods then hasClass
NEUTRAL_LANG_SELECTOR = '.' + 'neutral'
// user visible label
NEUTRAL_LANG_LABEL = 'Standard'

// including . to support also no prefix
// for import grass.script as gscript use "gscript"
// for from grass.script import run_command use ""
GRASS_SCRIPT_PREFIX = "grass."

// full name of the function to call grass command (without "(")
//GRASS_RUN_COMMAND = GRASS_SCRIPT_PREFIX + "run_command"

// link to be used to link modules
// including the last slash
GRASS_MANUAL_LINK = 'http://grass.osgeo.org/grass71/manuals/'
GRASS_ADDONS_MANUAL_LINK = 'http://grass.osgeo.org/grass70/manuals/addons/'

// addons we know about
// only those will be properly linked, the rest will result in broken link
GRASS_KNOWN_ADDONS = ['r.sun.hourly', 'r.sun.daily', 'r.regression.series']


if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, '');
  };
}

jQuery.fn.cleanWhitespace = function() {
    textNodes = this.contents().filter(
        function() { return (this.nodeType == 3 && !/\S/.test(this.nodeValue)); })
        .remove();
    return this;
}

function getMatches(string, regex, index) {
    index || (index = 1); // default to the first capturing group
    var matches = [];
    var match;
    while (match = regex.exec(string)) {
        matches.push(match[index]);
    }
    return matches;
}

function parse_code(code, lang) {

    var lines = code.split('\n');
    
    // in theory, can contain also empty lines and comments
    parsed_lines = [];
    
    for(var i = 0; i < lines.length; i++) {
        
        try {
            line = lines[i]
            line = line.trim()
            
            if (!line) {
                continue;
            }
            //console.log(line)
            
            var command = {
                module: null,
                flags: '',  // as string, e.g. abcd
                long_flags: [],  // as list of string, e.g. ["overwrite", "verbose"]
                options: []  // as list of objects {key: string, value: string, quote: string(empty or one of "')}
            }
            
            module_re = / *[a-z][3]?\.[a-z][a-z\.]*[a-z]/ // / *([a-z][3]?\.[a-z][a-z.]?) /
            module = module_re.exec(line)
            if (!module)
                // probably comment or something else
                continue;
            line = line.replace(module_re, '')
            //console.log('reduced: ' + line)
            //console.log('module:', module)
            command.module = module;

            option_re = / ([a-z_0-9]+)=/g
            //options = option_re.exec(line)
            options = getMatches(line, option_re)
            //console.log(options)
            for(var j = 0; j < options.length; j++) {
                option = options[j];
                //console.log('option ' + j + ': ' + option)
                quotes_char = '"'
                var option_value_re = new RegExp(" " + option + '="([^"]+[^\\\\])"');
                match = option_value_re.exec(line)
                if (!match) {
                    var option_value_re = new RegExp(" " + option + "='([^']+[^\\\\])'");
                    match = option_value_re.exec(line)
                    quotes_char = "'"
                }
                if (!match) {
                    var option_value_re = new RegExp(" " + option + "=([^ ]+)");
                    match = option_value_re.exec(line)
                    quotes_char = ''
                }
                value = match[1];
                //console.log('option ' + option + ': ' + value)
                
                var key_value_option = {
                    key: option,
                    value: value,
                    quote: quotes_char
                }
                command.options.push(key_value_option)
                
                // safer for the rest would be removing of match from string
            }

            var long_flag_re = /--([a-zA-Z0-9_]+)/g
            var long_flags = getMatches(line, long_flag_re)
            //console.log(flags)
            for(var j = 0; j < long_flags.length; j++) {
                var long_flag = long_flags[j];
                command.long_flags.push(long_flag)
                //console.log('command.long_flags: ' + command.long_flags)
            }

            var flag_re = / -([a-zA-Z0-9]+)/g
            var flags = getMatches(line, flag_re)
            //console.log(flags)
            for(var j = 0; j < flags.length; j++) {
                var flag = flags[j];
                // as long as flags is string this works also for multiple flags
                command.flags += flag
                //console.log('command.flags: ' + command.flags)
                //console.log('command.flags: ' + command.flags)
            }
            
            if ((command.module == 'r.mapcalc' || command.module == 'r3.mapcalc' ) && !command.options.length) {
                var flag_re = /"(.+ = .+)"/
                var matches = flag_re.exec(line)
                var key_value_option = {
                    key: 'expression',
                    value: matches[1],
                    quote: '"'
                }
                command.options.push(key_value_option)
            }
            
            parsed_lines.push(command);
            
        } catch (err) {
            var text = "There was an error on this page.\n\n";
            text += "Error description: " + err.message + "\n\n";
            text += "Click OK to continue.\n\n";
            text += "Line:\n";
            text += line;
            text += "\n\nSo far parsed:\n";
            text += "module name: " + command.module
            for(var j = 0; j < command.options.length; j++) {
                text += "\noption: " + command.options[j].key + " -- " + command.options[j].value + " -- " + command.options[j].quote;
            }
            text += "\n flags: " + command.flags;
            for(var j = 0; j < command.long_flags.length; j++) {
                text += "\n long flag: " + command.long_flags[j];
            }
            alert(text);
        }
        
    }
    return parsed_lines;
}

function print_python(parsed_code) {
        var new_code = ""
        var preferred_quote = "'";
        //console.log("YYY command.options[0].key: " + parsed_code[0].options[0].key)
        for (var i = 0; i < parsed_code.length; i++) {
            command = parsed_code[i];
            var line = GRASS_SCRIPT_PREFIX + "run_command(" + preferred_quote;
            line += command.module + preferred_quote;
            if (command.flags)
                line += ", flags=" + preferred_quote + command.flags + preferred_quote;
            for(var j = 0; j < command.options.length; j++) {
                option = command.options[j];
                var quote = option.quote;
                if (!quote)
                    quote = preferred_quote;
                if (line.length + option.key.length + option.value.length + 5 > 80) {
                    // end and flush line, indent new one
                    line += ',\n';
                    new_code += line;
                    line = new Array((GRASS_SCRIPT_PREFIX + "run_command(").length + 1).join(' ');
                }
                else {
                    line += ", ";
                }
                line += option.key + "=" + quote + option.value + quote;
            }
            line += ")"
            new_code += line + "\n";
        }
        return new_code;
}

function print_bash(parsed_code) {
        var new_code = "";
        for(var i = 0; i < parsed_code.length; i++) {
            var command = parsed_code[i];
            var line = command.module;
            if (command.flags)
                line += " -" + command.flags;
            for(var j = 0; j < command.options.length; j++) {
                var option = command.options[j];
                var quote = option.quote;
                if (line.length + option.key.length + option.value.length + 5 > 80) {
                    // end and flush line, indent new one
                    line += ' \\\n';
                    new_code += line;
                    line = new Array(4 + 1).join(' ');
                }
                else {
                    line += " ";
                }
                line += option.key + "=" + quote + option.value + quote;
            }
            new_code += line + "\n";
        }
        return new_code;
}

function print_gui(parsed_code) {
        var new_code = "";
        var quote = "";
        for(var i = 0; i < parsed_code.length; i++) {
            var command = parsed_code[i];
            if (command.module == 'd.rast' || command.module == 'd.legend') {
                var options = ""
                var mapname = ""
                for(var j = 0; j < command.options.length; j++) {
                    var option = command.options[j];
                    if (option.key == 'map' || option.key == 'rast') {
                        mapname = option.value;
                        continue;
                    }
                    var quote = option.quote;
                    options += " ";
                    options += option.key + " set to " + quote + option.value + quote;
                }
                line = "Add raster layer " + mapname + " to map display";
                if (options) {
                    line += " with option(s)" + options;
                }
                if (command.flags) {
                    line += " with flag(s)";
                    for(var k = 0; k < command.flags.length; k++) {
                        line += " " + command.flags[k];
                    }
                }
                new_code += line + "\n";
            } else {
                var line = command.module;
                if (command.flags)
                    line += " -" + command.flags;
                for(var j = 0; j < command.options.length; j++) {
                    var option = command.options[j];
                    var quote = option.quote;
                    line += " ";
                    line += option.key + "=" + quote + option.value + quote;
                }
                new_code += line + "\n";
            }
        }
        return new_code;
}

function generate_code(code, lang) {
    //console.log(code)
    var parsed = parse_code(code)
    if (lang == 'python') {
        return print_python(parsed);
    } else if (lang == 'bash') {
        return print_bash(parsed);
    } else if (lang == 'gui') {
        return print_gui(parsed);
    } else {
        return ""
    }
}

function isVisible(element) {
    tabcontent.css('display', 'block');
    tabcontent.addClass("visible");
}

function makeVisible(element) {
    tabcontent.css('display', 'block');
    tabcontent.addClass("visible");
}

function makeInvisible(element) {
    tabcontent.css('display', 'block');
    tabcontent.addClass("visible");
}

$(document).ready(function() {

    // using has function to be sure that pre is the one with code
    // we don't want to select pre with outputs
    $('pre').has('code').each(function() {
        $(this).wrap('<div class="tabs-container"></div>');
        if (!$(this).attr('id')) {
            var text = $(this).children('code').first().text();
            var re_to_replace = /\s|[\.=#\/\\\|"'()\[\]\{\}#%+]/g
            var re_to_replace = /[^a-zA-Z]/g
            var id = text.substring(0, 50).trim().replace(re_to_replace, '-')
            $(this).attr('id', id);
        }
    });

    $('pre').has('code').each(function() {
        var neutral_only = true;  // unused
        var small_command = false;  // unused
        var generate_others = true;
        $(this).children('code').each(function() {
            var code_element = $(this);
            if (!code_element.hasClass(NEUTRAL_LANG)) {
                if (code_element.is(".python,.bash,.gui")) {
                    // do nothing
                    neutral_only = false;
                    generate_others = false;
                }
                else {
                    code_element.addClass(NEUTRAL_LANG);
                    //console.log("add class")
                    //console.log(".............:" + code_element.text().search(/[^\s][\s][^\s]/g))
                    if (code_element.text().search(/[^\s][\s][^\s]/g) == -1) {
                        small_command = true;
                        generate_others = false;
                    }
                }
            } else {
                // it was specified that it is neutral
                generate_others = false;
            }
        });
        if (generate_others) {
            // add others to autogenerate
            $(this).append('<code class="python generate"></code>');
            $(this).append('<code class="bash generate"></code>');
            // $(this).append('<code class="gui generate"></code>');
        }
        element = $(this).children('code');
        element.css("display", "none");
        element.removeClass("visible");
        element = $(this).children('code').first();
        element.css('display', 'block');
        element.addClass("visible");
    });
    

    // using has to really get only those created above
    $('.tabs-container').has('pre').each(function() {
        $(this).prepend('<ul class="tabs-menu"></ul>');
    });
    // this might be useful for each pre
    $('pre').each(function() {
        $(this).cleanWhitespace();
        // samples are not trimmed as code is trimmed
        $(this).children('samp').each(function() {
            $(this).text($(this).text().trim());
        });
        
    });

    $('pre code').each(function() {
        var tabcontent = $(this)
        var lang = ''
        var description = ''
        if (tabcontent.hasClass('python')) {
            lang = 'python'
            description = '<img src="python.png" style="height: 1em; width: 1em; margin-right: 0.2em;">Python'
        }
        else if (tabcontent.hasClass('bash')) {
            lang = 'bash'
            description = '<img src="bash.png" style="height: 1em; width: 1em; margin-right: 0.2em;">Bash'
        }
        else if (tabcontent.hasClass('gui')) {
            lang = 'gui'
            description = '<img src="grass.png" style="height: 1em; width: 1em; margin-right: 0.2em;">GUI'
        }
        else if (tabcontent.hasClass(NEUTRAL_LANG)) {
            lang = NEUTRAL_LANG
            description = '<img src="grass.png" style="height: 1em; width: 1em; margin-right: 0.2em;">' + NEUTRAL_LANG_LABEL
        }
        else {
            lang = NEUTRAL_LANG
            description = '<img src="grass.png" style="height: 1em; width: 1em; margin-right: 0.2em;">' + NEUTRAL_LANG_LABEL
        }
        //console.log(tabcontent.parent().parent().children('ul'))
        /*closest('tabs-container')*/
        var parentid = tabcontent.parent().attr('id');
        var tabid = parentid + '-' + lang;
        tabcontent.attr('id', tabid);
        
        ul = tabcontent.parent().parent().children('ul')
        var menuitem = '<li';
        //if (lang == NEUTRAL_LANG) {
        //    // make item and tab visible
        //    menuitem += ' class="current"';
        //    tabcontent.css('display', 'block');
        //    tabcontent.addClass("visible");
        //}
        if (!ul.children('li').length) {
            //menuitem.addClass('current');
            menuitem += ' class="current"';
        }
        
        menuitem += '><a href="#' + tabid + '">' + description + '</a></li>';
        
        ul.append(menuitem)
        
        if (tabcontent.hasClass('generate')) {
            //if (!tabcontent.siblings('.neutral').text()) {
                //console.log("XXXX-----" + tabcontent.siblings('.neutral').text() + "---------XXXXX")
            //}
            tabcontent.text(generate_code(tabcontent.siblings(NEUTRAL_LANG_SELECTOR).text(), lang));
            //console.log(tabcontent[0]);
        } else {
            tabcontent.text(tabcontent.text().trim());
        }
        hljs_lang = lang;
        if (lang == NEUTRAL_LANG)
            hljs_lang = 'bash';
        if (lang != 'gui') {
            hljs.configure({languages: [hljs_lang]});
            hljs.highlightBlock(tabcontent[0]);
        }
    });

    $(".tabs-menu a").each(function() {
        $(this).click(function(event) {
            event.preventDefault();
            $(this).parent().addClass("current");
            $(this).parent().siblings().removeClass("current");
            var tab = $(this).attr("href");
            var others = $(this).parent().parent().parent().children('div, pre').children("code").not(tab);
            $(tab).css("display", "block");
            $(tab).addClass("visible");
            others.css("display", "none");
            others.removeClass("visible");
        });
    });
/*
    var toc_element = $('<div/>');
    var current_level = 0;
    $("h1, h2, h3, h4, h5, h6").each(function() {
        var element = $(this);
        var text = element.text();
        var id = text.replace(/ /g, "-");
        element.attr("id", id);
        
        level = parseInt(this.tagName.substring(1));
        
        var li = $('<li/>').text(text);
        
        if (level > current_level) {
            toc_element.append($('<ul/>').append(li));
            toc_element = li;
        } else if (level < current_level) {
            toc_element.parents('ol:eq(' + (current_level - level - 1) + ')').append(li);
            toc_element = li;
        } else {
            toc_element.parent().append(li);
            toc_element = li;
        }
        
        current_level = level;
    });
    
    

    toc_element = toc_element.parents('ol:last');
    toc_element.attr('id', 'table-of-contents');
    console.log(toc_element)
    $('body').prepend(toc_element)
*/

    // link modules to grass documentation
    $("pre code").each(function() {
        // creating a link around module name
        // the groups 1 and 3 makes sure that we don't match things inside python functions
        // this limit matching of pygrass but any python will be probably necessary to handle separately anyway
        function module_link_code_replacer(match, p1, p2, p3, offset, string){
            link = GRASS_MANUAL_LINK
            if (GRASS_KNOWN_ADDONS.indexOf(p2) >= 0)
                link = GRASS_ADDONS_MANUAL_LINK;
            return p1 + '<a href="' + link + p2 + '.html" class="modulelink">' + p2 + '</a>' + p3;
        }
        $(this).html($(this).html().replace(/(^|['"`\s\.])([a-z]3?\.[a-zA-Z.0-9]+[a-zA-Z0-9])(['"`\s\.]|$)/g, module_link_code_replacer)); 
    });

    $("p").each(function() {
        // putting module to em as a link
        // here the groups before and after should avoid some strange combinations
        function module_link_par_replacer(match, p1, p2, p3, offset, string){
            link = GRASS_MANUAL_LINK
            if (GRASS_KNOWN_ADDONS.indexOf(p2) >= 0)
                link = GRASS_ADDONS_MANUAL_LINK;
            return p1 + '<em><a href="' + link + p2 + '.html" class="modulelink">' + p2 + '</a></em>' + p3;
        }
        $(this).html($(this).html().replace(/(^|[^a-zA-Z_])([a-z]3?\.[a-zA-Z.0-9]+[a-zA-Z0-9])([^a-zA-Z_]|$)/g, module_link_par_replacer)); 
    });

    // this is toc, not code
    //var toc = "";
    //var level = 0;

    //document.getElementById("contents").innerHTML =
    	//document.getElementById("contents").innerHTML.replace(
    		///<h([\d])>([^<]+)<\/h([\d])>/gi,
    		//function (str, openLevel, titleText, closeLevel) {
    			//if (openLevel != closeLevel) {
    				//return str;
    			//}

    			//if (openLevel > level) {
    				//toc += (new Array(openLevel - level + 1)).join("<ul>");
    			//} else if (openLevel < level) {
    				//toc += (new Array(level - openLevel + 1)).join("</ul>");
    			//}

    			//level = parseInt(openLevel);

    			//var anchor = titleText.replace(/ /g, "-");
    			//toc += "<li><a href=\"#" + anchor + "\">" + titleText
    				//+ "</a></li>";

    			//return "<h" + openLevel + "><a name=\"" + anchor + "\">"
    				//+ titleText + "</a></h" + closeLevel + ">";
    		//}
    	//);

    //if (level) {
    //	toc += (new Array(level + 1)).join("</ul>");
    //}

    //document.getElementById("table-of-contents").innerHTML += toc;

});
