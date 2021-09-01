/*
 * Modifies the cluster as defined by the body parameter. 
 * See https://docs.atlas.mongodb.com/reference/api/clusters-modify-one/
 *
 */
exports = async function(username, password, projectID, clusterName, body) {
  
  const arg = { 
    scheme: 'https', 
    host: 'cloud.mongodb.com', 
    path: 'api/atlas/v1.0/groups/' + projectID + '/clusters/' + clusterName, 
    username: username, 
    password: password,
    headers: {'Content-Type': ['application/json'], 'Accept-Encoding': ['bzip, deflate']}, 
    digestAuth:true,
    body: JSON.stringify(body)
  };
  
  // The response body is a BSON.Binary object. Parse it and return.
  response = await context.http.patch(arg);

  return EJSON.parse(response.body.text()); 
};

