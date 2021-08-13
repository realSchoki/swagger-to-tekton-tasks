const SwaggerParser = require("@apidevtools/swagger-parser");
const fs = require("fs");

const nunjucks = require('nunjucks');
nunjucks.configure({ autoescape: true });

const myAPI = "swagger.json";
const file = 'task.j2';

var env = new nunjucks.Environment(new nunjucks.FileSystemLoader('views'),
                          { autoescape: false });

env.addFilter('filter_by_parameter_in', function(arr, in_type) {
  return arr?arr.filter( elem => elem.in === in_type ):undefined;
});

env.addFilter('replace_path_parameter_to_tekton_vars', function(str) {
  return str?str.replace(/\{([^\/]+)\}/g, "$(params.$1)"):undefined;
});


SwaggerParser.validate(myAPI, (err, api) => {
    if (err) {
      console.error(err);
    } else {
      const output = fs.openSync('output.yaml', 'w+');

      for (const [path, path_obj] of Object.entries(api.paths)) {
        var name =  `argocd-api.${
          path
          .replace(/^[\/]+/, "")
          .replace('/application/', '/app/')
          .replace('/applications/', '/apps/')
          .replace('/repositorie/', '/repo/')
          .replace('/repositories/', '/repos/')
          .replace(/\//g, "-")
        }`
        
        var count = 0;
        const matches = name.matchAll(/\{[\.a-zA-Z0-9]+\}/g);
        for(const match of matches) {
          name = name.replace(match[0], `x${count}`)
          count++
        }
        
        for (const [method, method_obj] of Object.entries(path_obj)) {
            name += `.${method}`
            
            const curl_ = `curl $ARGOCD_SERVER/api/v1/applications -H "Authorization: Bearer $ARGOCD_TOKEN"`

            fs.appendFileSync(output,  env.render(file, ({method_obj: method_obj, method: method, path_obj: path_obj, path: path, name: name})));
        }
      }
      
      fs.closeSync(output);
    }
});