import {execSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
for(const service of ["catalogue","warehouse","orders"]){
  execSync(`npm --workspace @mcmasterful/${service} run generate`,{stdio:"inherit"});
}
const specs=[];
for(const service of ["catalogue","warehouse","orders"]){
  const spec=JSON.parse(fs.readFileSync(path.join(root,"services",service,"build","swagger.json"),"utf8"));
  specs.push(spec);
}
const combined={
  openapi:"3.0.0",
  info:{title:"McMasterful Books API",version:"7.0.0",description:"Catalogue, warehouse and orders APIs communicating through events."},
  servers:[{url:"http://localhost:8080"}],
  paths:{},
  components:{schemas:{}}
};
for(const spec of specs){
  Object.assign(combined.paths,spec.paths);
  Object.assign(combined.components.schemas,spec.components?.schemas??{});
}
fs.mkdirSync(path.join(root,"services/swagger/build"),{recursive:true});
fs.writeFileSync(path.join(root,"services/swagger/build/swagger.json"),JSON.stringify(combined,null,2));
console.log("Combined OpenAPI written to services/swagger/build/swagger.json");
