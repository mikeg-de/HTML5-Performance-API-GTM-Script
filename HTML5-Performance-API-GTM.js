<script>
/*
HTML5 APIs
	http://www.w3.org/TR/#tr_Web_Performance

HTML5 Navigation Timing API
	https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTiming
	https://developers.google.com/web/fundamentals/performance/critical-rendering-path/measure-crp?hl=en
	https://dvcs.w3.org/hg/webperf/raw-file/16f80e9cfd02/tests/submission/Microsoft/NavigationTiming/test_timing_attributes_ordering_simple_test.htm
	http://www.w3.org/TR/navigation-timing/

HTML5 Resource Timing API
	http://www.w3.org/TR/resource-timing/#timing-allow-origin

DOM states
	https://developer.mozilla.org/en-US/docs/Web/Events/DOMContentLoaded

Critical Render  Path
	https://developers.google.com/web/fundamentals/performance/critical-rendering-path/analyzing-crp	

W3C Test Suits
	http://w3c-test.org/navigation-timing/
	http://w3c-test.org/resource-timing/

Additional resources
	https://varvy.com/performance/navigation-timing-api.html
	http://www.sitepoint.com/introduction-resource-timing-api/
*/

var	now			= new Date().getTime(),
	navigationType	= performance.navigation.type,
	totalLoadTime		= (now - performance.timing.navigationStart)/1000, // Total load time

	// 1st segment: Server & Network latency
	unload			= (performance.timing.unloadEventEnd - performance.timing.unloadEventStart)/1000, // Zero if there is no prev. document or prev. document has differen origin
	redirect			= (performance.timing.redirectEnd - performance.timing.redirectStart)/1000, // Redirect by server, Zero if there is no redirect
	appCache		= (performance.timing.domainLookupStart - performance.timing.fetchStart)/1000, // Access browser cache on client side
	dns			= (performance.timing.domainLookupEnd - performance.timing.domainLookupStart)/1000, // Resolve DNS information
	tcpConnect		= (performance.timing.connectEnd - performance.timing.connectStart)/1000, // Establish connection
	sslConnect		= 0, // SSL negotiation, calculated later as it would be negative when no SSL is used
	timeToFirstByte		= (performance.timing.responseStart - performance.timing.requestStart)/1000, // TTFB Request document
	milestone1Connect	= (performance.timing.responseStart - performance.timing.navigationStart)/1000, // Time from starting to navigate to until first byte of DOM is received by user agent (network latency)

	// 2nd segment: Time to first paint from first byte until DOM is parsed perceived load speed by user (w/o network latency)
	downloadDom			= (performance.timing.responseEnd - performance.timing.responseStart)/1000, // DOM download completed, last byte received
	parseDom			= (performance.timing.domInteractive - performance.timing.responseEnd)/1000, // DOM parsing completed, ready state set to interactive, sub resources (e.g. CSS) start loading
	loadBlockingSubressources	= (performance.timing.domContentLoadedEventStart - performance.timing.domInteractive)/1000, // Time to 1st paint – Parsed & executed Blocking resources (DOM, CSS, synchronous scripts)	
	milestone2FirstPaint		= (performance.timing.domContentLoadedEventStart - performance.timing.requestStart)/1000, // Time from first byte until DOM is parsed

	// 3rd segment: Sub-resources process and render contents
	processingDomContentLoaded	= (performance.timing.domContentLoadedEventEnd - performance.timing.domContentLoadedEventStart)/1000, // Executed all non-blocking resources
	processingDomComplete		= (performance.timing.domComplete - performance.timing.domContentLoadedEventEnd)/1000, // Load and process sub-resources, ready state set to complete
	loadAdditionalResources		= (performance.timing.loadEventEnd - performance.timing.loadEventStart)/1000; // Load resources e.g. through XHR, JS etc. after window.load
	milestone3CompletePage		= 0, // Initialized, calculated in next switch depending on loadEventEnd

	redirectCount	= performance.navigation.redirectCount;// Amount of redirects

	// Commented as navigation type takes precedence
	//loadTimeEventAction = parseFloat((Math.round(totalLoadTime*2)/2).toFixed(1)); // GA event action, round to first decimal in .5 steps for convenient to prevent cluttering

switch (true) {
	case (loadAdditionalResources <= 0):
		loadAdditionalResources	= 0; // Set to 0 as a fallback to prevent negative numbers since loading could be triggered with timer
		milestone3CompletePage	= (performance.timing.domComplete - performance.timing.domContentLoadedEventStart)/1000; // Time after DOM loaded sub-resources
		break;
	default:
		milestone3CompletePage	= (performance.timing.loadEventEnd - performance.timing.domContentLoadedEventStart)/1000; // Time after DOM loaded sub-resources
}

// Enricht GA event action with navigation types
// TYPE_NAVIGATE: 0; TYPE_RELOAD: 1; TYPE_BACK_FORWARD: 2 ; TYPE_RESERVED: 255
switch (navigationType) {
	case 1:
		navigationType = navigationType + " Reload";
		break;
	case 2:
		navigationType = navigationType + " History change";
		break;
	case 255:
		navigationType = navigationType + " Undefined";
		break;
	default:
		navigationType = navigationType + " Navigate";
}

// Mark initial request
if (appCache == 0) {
	navigationType = navigationType + ' Initial';
}

// Redirects
// Redirects not count for sub-domains or protocoll changes
if (redirectCount > 0) {
	navigationType = navigationType + ' ' + redirectCount;
}

if (performance.timing.secureConnectionStart > 0) {
	sslConnect		= (performance.timing.secureConnectionStart - performance.timing.connectStart)/1000; // Calculate SSL-Negotiation time
	navigationType	= navigationType + " SSL"; // Mark SSL connections in GA event action
}

// Syntax
// dataLayer.push({"event" : "eventName", "eventCategory" : "category", "eventAction" : "action", "eventLabel": "optional_label", "eventValue" : "optional_value", "nonInteractive": boolean});
// set unused variables to "undefined" to prevent mixing of values from different events
// nonInteraction: Exlude from BR calculation when event is triggered

dataLayer.push ({
	"event": "PageLoadTime",
	"eventCategory": "Page Load Time",
	"eventAction": navigationType,
	"eventLabel":	unload + "|" + redirect + "|" + appCache + "|" + dns + "|" + tcpConnect + "|" + sslConnect + "|" + milestone1Connect + "|" +
			timeToFirstByte + "|" + downloadDom + "|" + parseDom + "|" + loadBlockingSubressources + "|" + milestone2FirstPaint + "|" +
			processingDomContentLoaded + "|" + processingDomComplete + "|" + loadAdditionalResources + "|" + milestone3CompletePage,
	"eventValue" : totalLoadTime, "nonInteractive": 1});
</script>