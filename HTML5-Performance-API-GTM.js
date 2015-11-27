<script>
//////////////////////////////
// HTML5 Performance Navitaion Timing API
//////////////////////////////

/*	Resources
	http://www.w3.org/TR/navigation-timing/
	https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTiming
	https://developers.google.com/web/fundamentals/performance/critical-rendering-path/measure-crp?hl=en
	https://dvcs.w3.org/hg/webperf/raw-file/16f80e9cfd02/tests/submission/Microsoft/NavigationTiming/test_timing_attributes_ordering_simple_test.htm
	https://developer.mozilla.org/en-US/docs/Web/Events/DOMContentLoaded
	https://developers.google.com/web/fundamentals/performance/critical-rendering-path/analyzing-crp	
*/

var	now			= new Date().getTime(),
	navigationType	= performance.navigation.type,
	totalLoadTime		= [
		// 1st segment: Server & Network latency
		(performance.timing.unloadEventEnd - performance.timing.unloadEventStart)/1000, // Unload: Zero if there is no prev. document or prev. document has differen origin
		(performance.timing.redirectEnd - performance.timing.redirectStart)/1000, // Redirect by server, Zero if there is no redirect
		(performance.timing.domainLookupStart - performance.timing.fetchStart)/1000, // App Cache: Access browser cache on client side
		(performance.timing.domainLookupEnd - performance.timing.domainLookupStart)/1000, // DNS: Resolve DNS information
		(performance.timing.connectEnd - performance.timing.connectStart)/1000, // TCP Connect: Establish connection
		0, // SSL negotiation, calculated later as it would be negative when no SSL is used
		(performance.timing.responseStart - performance.timing.requestStart)/1000, // TTFB Request document
		(performance.timing.responseStart - performance.timing.navigationStart)/1000, // Milestone 1 "Network Latency": Time from starting to navigate to until first byte of DOM is received by user agent (network latency)

		// 2nd segment: Time to first paint from first byte until DOM is parsed perceived load speed by user (w/o network latency)
		(performance.timing.responseEnd - performance.timing.responseStart)/1000, // DOM download completed, last byte received
		(performance.timing.domInteractive - performance.timing.responseEnd)/1000, // DOM parsing completed, ready state set to interactive, sub resources (e.g. CSS) start loading
		(performance.timing.domContentLoadedEventStart - performance.timing.domInteractive)/1000, // Time to 1st paint – Parsed & executed Blocking resources (DOM, CSS, synchronous scripts)	
		(performance.timing.domContentLoadedEventStart - performance.timing.requestStart)/1000, // Milestone 2 "DOm & CSSDOM parsed": Time from first byte until DOM is parsed

		// 3rd segment: Sub-resources process and render contents
		(performance.timing.domContentLoadedEventEnd - performance.timing.domContentLoadedEventStart)/1000, // Executed all non-blocking resources
		(performance.timing.domComplete - performance.timing.domContentLoadedEventEnd)/1000, // Load and process sub-resources, ready state set to complete
		0, // Load resources e.g. through XHR, JS etc. after window.load
		0, // Milestone 3 "Page completed": Initialized, calculated in next switch depending on loadEventEnd
	
		(now - performance.timing.navigationStart)/1000], // Total load time

	redirectCount	= performance.navigation.redirectCount, // Amount of redirects

	// Resource Timing API metrics
	resourceList		= window.performance.getEntriesByType("resource"),
	resourceRegEx	= [".*\.(jpg|jpeg|png|gif|tif|tiff)", ".*\.css", ".*\.js", ".*\.(eot|woff|ttf|svg)"],
	resourceTypes		= ["Image", "CSS", "JavaScript", "Font"],
	initiatorTypes		= ["link", "img", "script", "xmlhttprequest"],
	resources		= new Array(resourceRegEx.length+1).join('0').split('').map(parseFloat),
	resourceTiming	= [];

	// Commented as navigation type takes precedence
	//loadTimeEventAction = parseFloat((Math.round(totalLoadTime*2)/2).toFixed(1)); // GA event action, round to first decimal in .5 steps for convenient to prevent cluttering

switch (true) {
	case ((performance.timing.loadEventEnd - performance.timing.loadEventStart) <= 0):
		loadAdditionalResources	= 0; // Set to 0 as a fallback to prevent negative numbers since loading could be triggered with timer
		totalLoadTime[totalLoadTime.length-2]	= (performance.timing.domComplete - performance.timing.domContentLoadedEventStart)/1000; // Time after DOM loaded sub-resources
		break;
	default:
		totalLoadTime[totalLoadTime.length-2]	= (performance.timing.loadEventEnd - performance.timing.domContentLoadedEventStart)/1000; // Time after DOM loaded sub-resources
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
if (totalLoadTime[2] == 0) {
	navigationType = navigationType + ' Initial';
}

// Redirects
if (redirectCount > 0) {
	navigationType = navigationType + ' ' + redirectCount;
}

if (performance.timing.secureConnectionStart > 0) {
	totalLoadTime[5]	= (performance.timing.secureConnectionStart - performance.timing.connectStart)/1000; // Calculate SSL-Negotiation time
	navigationType		= navigationType + " SSL"; // Mark SSL connections in GA event action
}

// Syntax
// dataLayer.push({"event" : "eventName", "eventCategory" : "category", "eventAction" : "action", "eventLabel": "optional_label", "eventValue" : "optional_value", "nonInteractive": boolean});
// set unused variables to "undefined" to prevent mixing of values from different events
// nonInteraction: Exlude from BR calculation when event is triggered

totalresourceRegEx();

dataLayer.push ({
	"event": "PageLoadTime",
	"eventCategory": "Page Load Time",
	"eventAction": navigationType,
	"eventLabel": resourceList.length + "," + resources + " - " + totalLoadTime.join("|"),
	"eventValue" : totalLoadTime[totalLoadTime.length-1],
	"nonInteractive": 1
});

//////////////////////////////
// HTML5 Performance Resource Timing API
//////////////////////////////

/*	Resources
	http://www.w3.org/TR/resource-timing/#widl-PerformanceResourceTiming-transferSize
	http://www.stevesouders.com/blog/2014/11/25/serious-confusion-with-resource-timing/
	http://www.stevesouders.com/blog/2014/08/21/resource-timing-practical-tips/
	http://www.sitepoint.com/introduction-resource-timing-api/
	http://blog.trasatti.it/2012/12/measuring-the-speed-of-resource-loading-with-javascript-and-html5.html
	http://www.slideshare.net/turbobytes/state-of-the-resource-timing-api
	http://www.slideshare.net/nicjansma/using-modern-browser-apis-to-improve-the-performance-of-your-web-applications
	http://jatindersmann.com/tag/performance-timing/
	http://nicj.net/resourcetiming-in-practice/
*/

// Internal vs. External
// Total resources (JS, CSS, IMG)
// onresourcetimingbufferfull: browser default 150, if > 150 too many resources!?!
function totalresourceRegEx () {
	for (i = 0; i < resourceList.length; i++) {
		for (p = 0; p < resourceRegEx.length; p++) {
			if(resourceList[i].name.match(resourceRegEx[p])) {
				 resources[p]++;
			}
		}
	}
}

function resourceBottleneck () {
	for (i = 0; i < resourceList.length; i++) {
		for (p = 0; p < initiatorTypes.length; p++) {
			if(resourceList[i].initiatorType.match(initiatorTypes[p]) && ((resourceList[i].duration/1000) / totalLoadTime[0]) >= 0.1) {

				resourceTiming	= [
					// Queue time can't be calculated propery, Strong indicator is Mileston 1
					//((Math.max(resourceList[i].domainLookupStart, resourceList[i].connectStart, resourceList[i].requestStart) - resourceList[i].startTime)/1000).toFixed(3), // Queueing
					((resourceList[i].redirectEnd - resourceList[i].redirectStart)/1000).toFixed(3), // Redirect
					((resourceList[i].domainLookupStart - resourceList[i].fetchStart)/1000).toFixed(3), // App Cache or Idle time
					((resourceList[i].domainLookupEnd - resourceList[i].domainLookupStart)/1000).toFixed(3), // DNS
					((resourceList[i].connectEnd - resourceList[i].connectStart)/1000).toFixed(3), // TCP includes ssl negotiation
					0, // SSL Negotiation - Calculated later
					((resourceList[i].responseStart - resourceList[i].requestStart)/1000).toFixed(3), // TTFB - Time to first byte
					((resourceList[i].responseStart - resourceList[i].startTime)/1000).toFixed(3), // Milestone 1 Network Latency
					((resourceList[i].responseEnd - resourceList[i].responseStart)/1000).toFixed(3), // Transfer time
					(resourceList[i].duration/1000).toFixed(3)] // Complete dowload time

				var resourceEventAction = initiatorTypes[p] + " " + resourceList[i].name.split("/").pop().split("?")[0];

				// Mark chached resources
				// startTime == connectEnd == connectStart == domainLookupEnd == domainLookupStart
				//if (resourceList[i].startTime == resourceList[i].connectStart == resourceList[i].connectEnd) {
				//	resourceEventAction = resourceEventAction + ' Cached';
				//}

				// Redirects
				if (resourceList[i].redirectStart > 0) {
					resourceEventAction = resourceEventAction + ' ' + "Redirected";
				}

				if (resourceList[i].secureConnectionStart > 0) {
					resourceTiming[i]	= ((resourceList[i].secureConnectionStart - resourceList[i].connectStart)/1000).toFixed(3); // Calculate SSL-Negotiation time
					resourceEventAction	= resourceEventAction + " SSL"; // Mark SSL connections in GA event action
				}

				// GA-Event
				// Category: Load Time Resource, Action: initiatorTypes + resourceRegEx, Label: resourceList[i].name, Value resourceList[i].duration/1000
				dataLayer.push ({
					"event": "Load Time Resource",
					"eventCategory": "Load Time Resource",
					// identArrayIndex von resourceRegEx
					//"eventAction": initiatorTypes[p] + " " + resourceList[i].name.replace(/.*\.(\w{2,4})(\?.*)?$/, "$1"),
					"eventAction": resourceEventAction,
					"eventLabel": resourceTiming.join("|"),
					"eventValue": resourceTiming[resourceTiming.length-1],
					"nonInteractive": 1
				});
			}
		}
	}
}

resourceBottleneck();
</script>