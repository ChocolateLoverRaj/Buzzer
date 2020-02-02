//Tools for any page to use
const app = {};

//Make an api request
app.request = (headers, path, method, queryStringObject, payload, callback) => {
    //Set defaults
    headers = typeof (headers) == 'object' && headers != null ? headers : {};
    path = typeof (path) == 'string' ? path : "/";
    const acceptableMethods = ["POST", "GET", "PUT", "DELETE"];
    method = typeof (method) == 'string' && acceptableMethods.indexOf(method) > -1 ? method : "GET";
    queryStringObject = typeof (queryStringObject) == 'object' && queryStringObject != null ? queryStringObject : {};
    payload = typeof (payload) == 'object' && payload != null ? payload : {};
    callback = typeof (callback) == 'function' ? callback : false;

    //For each queryString parameter sent, add it to the path
    var requestURL = path + "?";
    var first = true;
    for (var queryKey in queryStringObject) {
        if (queryStringObject.hasOwnProperty(queryKey)) {
            //If at least one string parameter is added, add "&"
            if (first) {
                requestURL += "&";
                first = false;
            }

            //Add the key and value
            requestURL += queryKey + "=" + queryStringObject[queryKey];
        }
    }

    //Form the http request as JSON type
    var xhr = new XMLHttpRequest();
    xhr.open(method, requestURL, true);
    xhr.setRequestHeader("Content-type", "application/json");

    //For each header sent, add it to the request
    for (var headerKey in headers) {
        if (headers.hasOwnProperty(headerKey)) {
            xhr.setRequestHeader(headerKey, headers[headerKey]);
        }
    }

    //When the request comes back, handle the response
    xhr.onreadystatechange = () => {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            var statusCode = xhr.status;
            var responseReturned = xhr.responseText;

            //Callback if requested
            if (callback) {
                try {
                    var parsedResponse = JSON.parse(responseReturned);
                    callback(statusCode, parsedResponse);
                }
                catch (e) {
                    callback(statusCode, false);
                }
            }
        }
    };

    //Send the payload as JSON
    var payloadString = JSON.stringify(payload);

    //Send
    xhr.send(payloadString);

    //Return the xhr object
    return xhr;
};