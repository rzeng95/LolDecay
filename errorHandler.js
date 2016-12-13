module.exports = (err) => {
    let errorMessage;
    switch(err) {
        case 400:
            errorMessage = 'Internal error - Oops!';
            break;
        case 401:
            errorMessage = 'Out of date API key - Oops!';
            break;
        case 403:
            errorMessage = 'Invalid API key - Oops!';
            break;
        case 429:
            errorMessage = 'Rate Limit Exceeded - Oops!';
            break;
        case 500:
        case 503:
            errorMessage = 'Internal Issue with Riot\'s API - Try again later.';
            break;
        default:
            errorMessage = err;
    }
    return errorMessage;
}
