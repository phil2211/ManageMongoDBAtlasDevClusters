//returns all not paused cluster names
exports = async function(username, password, projectID) {

  const arg = { 
    scheme: 'https', 
    host: 'cloud.mongodb.com', 
    path: 'api/atlas/v1.0/groups/' + projectID + '/clusters/', 
    username: username, 
    password: password,
    headers: {'Content-Type': ['application/json'], 'Accept-Encoding': ['bzip, deflate']}, 
    digestAuth:true
  };
  
  // The response body is a BSON.Binary object. Parse it and return.
  response = await context.http.get(arg);
  const returnBody = EJSON.parse(response.body.text());
  //console.log(JSON.stringify(returnBody));
  var clusters = [];
  returnBody.results.forEach(function (cluster) {
    if(!cluster.paused) {
      clusters.push(cluster.name);
    }
  });

  return clusters; 
};