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
    var listenerType = "addEventListener" in window ? "addEventListener" : "attachEvent",
        hashChangeType = listenerType == 'addEventListener' ? 'hashchange' : 'onhashchange',
        now = new Date().getTime(),
        oldNow = now, // Used for XHR loads
        xhrCounter = 0, // Used to count multiple XHR's i.e. on multiple changes of drop downs on CPS
        navigationType = performance.navigation.type,
        totalLoadTime = [
            // 1st segment: Server & Network latency
            (performance.timing.unloadEventEnd - performance.timing.unloadEventStart) / 1000, // Unload: Zero if there is no prev. document or prev. document has differen origin
            (performance.timing.redirectEnd - performance.timing.redirectStart) / 1000, // Redirect by server, Zero if there is no redirect
            (performance.timing.domainLookupStart - performance.timing.fetchStart) / 1000, // App Cache: Access browser cache on client side
            (performance.timing.domainLookupEnd - performance.timing.domainLookupStart) / 1000, // DNS: Resolve DNS information
            (performance.timing.connectEnd - performance.timing.connectStart) / 1000, // TCP Connect: Establish connection
            0, // SSL negotiation, calculated later as it would be negative when no SSL is used
            (performance.timing.responseStart - performance.timing.requestStart) / 1000, // TTFB Request document
            (performance.timing.responseStart - performance.timing.navigationStart) / 1000, // Milestone 1 "Network Latency": Time from starting to navigate to until first byte of DOM is received by user agent (network latency)

            // 2nd segment: Time to first paint from first byte until DOM is parsed perceived load speed by user (w/o network latency)
            (performance.timing.responseEnd - performance.timing.responseStart) / 1000, // DOM download completed, last byte received
            (performance.timing.domInteractive - performance.timing.responseEnd) / 1000, // DOM parsing completed, ready state set to interactive, sub resources (e.g. CSS) start loading
            (performance.timing.domContentLoadedEventStart - performance.timing.domInteractive) / 1000, // Time to 1st paint – Parsed & executed Blocking resources (DOM, CSS, synchronous scripts)
            (performance.timing.domContentLoadedEventStart - performance.timing.requestStart) / 1000, // Milestone 2 "DOM & CSSDOM parsed": Time from first byte until DOM is parsed

            // 3rd segment: Sub-resources process and render contents
            (performance.timing.domContentLoadedEventEnd - performance.timing.domContentLoadedEventStart) / 1000, // Executed all non-blocking resources
            (performance.timing.domComplete - performance.timing.domContentLoadedEventEnd) / 1000, // Load and process sub-resources, ready state set to complete
            0, // Load resources e.g. through XHR, JS etc. after window.load
            0, // Milestone 3 "Page completed": Initialized, calculated in next switch depending on loadEventEnd

            (now - performance.timing.navigationStart) / 1000
        ], // Total load time

        redirectCount = performance.navigation.redirectCount, // Amount of redirects
        domNodes = document.getElementsByTagName('*').length, // DOM-Complexity
        documentDomain = document.location.hostname, // GTM Macro used to determine document origin
        origin = undefined, // Used to write in resource array 1st dimension
        initType = undefined, // Used to write in resource array 2nd dimension
        initTypes = ["link", "img", "script", "xmlhttprequest", "iframe", "css"],
        resourceType = undefined, // Used to write in resource array 2nd dimension
        resourceList = !(/MSIE (\d.\d+);/.test(navigator.userAgent) || window.performance.getEntriesByType === undefined) ? window.performance.getEntriesByType("resource") : undefined,
        resourceRegEx = ["(jpg|jpeg|png|gif|tif|tiff|webp|ico)", "css", "js", "(eot|woff|ttf|svg)", "(html|php|pl)", ".*"],
        resourceTypes = ["Image", "CSS", "JavaScript", "Font", "Document", "Fallback"],
        //resources = new Array(resourceRegEx.length+1).join('0').split('').map(parseFloat), // Create array
        resourceCount = new Array(resourceRegEx.length + 1).join('0').split("").map(parseFloat); // Array to count occurencies of resourceTypes

    // Commented as navigation type takes precedence
    //loadTimeEventAction = parseFloat((Math.round(totalLoadTime*2)/2).toFixed(1)); // GA event action, round to first decimal in .5 steps for convenient to prevent cluttering

    // Thanks to Matthew Crumley: http://stackoverflow.com/questions/966225/how-can-i-create-a-two-dimensional-array-in-javascript
    function createArray(length) {
        var arr = new Array(length || 0),
            i = length;

        if (arguments.length > 1) {
            var args = Array.prototype.slice.call(arguments, 1);
            while (i--) arr[length - 1 - i] = createArray.apply(this, args);
        }

        return arr;
    }

    var resourceContribution = createArray(3, resourceTypes.length, initTypes.length, 2); // Array to store occurencies and timing contribution by origin (who), resourceTypes (what) and initTypes (how)

    switch (true) {
        case ((performance.timing.loadEventEnd - performance.timing.loadEventStart) <= 0):
            totalLoadTime[totalLoadTime.length - 2] = (performance.timing.domComplete - performance.timing.domContentLoadedEventStart) / 1000; // Time after DOM loaded sub-resources
            break;
        default:
            totalLoadTime[totalLoadTime.length - 2] = (performance.timing.loadEventEnd - performance.timing.domContentLoadedEventStart) / 1000; // Time after DOM loaded sub-resources
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
    if (totalLoadTime[2] === 0) {
        navigationType = navigationType + ' Initial';
    }

    // Redirects
    if (redirectCount > 0) {
        navigationType = navigationType + ' ' + redirectCount;
    }

    if (performance.timing.secureConnectionStart > 0) {
        totalLoadTime[5] = (performance.timing.secureConnectionStart - performance.timing.connectStart) / 1000; // Calculate SSL-Negotiation time
        navigationType = navigationType + " SSL"; // Mark SSL connections in GA event action
    }

    var totalResources = (resourceList === undefined) ? 0 : resourceList.length;

    if (resourceList !== undefined) {
        resourceDetails();
    }

    // Implementation to distinguish XHR loads i.e. on product pages
    // Thanks to Steve Field, a colleageu of mine at Brady's
    window[listenerType](hashChangeType, function hashChange(event) {
        now = new Date().getTime(); // Equivalent to performance.timing.navigationStart
        totalLoadTime[totalLoadTime.length - 1] = (now - oldNow) / 1000; // Calc new total load time
        oldNow = now; // Save current total load time

        // SHould be done only once
        xhrCounter++;
        if (xhrCounter === 1) {
            navigationType = navigationType + " XHR";
        } // Mark XHR load in GA event action
        // A counter should increase if multiple XHR's happened

        dataLayer.push({
            "event": "Load Time Total",
            "eventCategory": "Page Load Time",
            "eventAction": navigationType + " " + xhrCounter,
            "eventLabel": totalResources + "," + resourceCount + " - " + domNodes + " - " + totalLoadTime.join("|"), // Total resources, Amount of resources by type, DOM-Nodes and Performance Metrics of root document
            "eventValue": totalLoadTime[totalLoadTime.length - 1] * 1000, // Total Load Time in thousands as GA cuts floats to integer
            "nonInteractive": 1
        });
    });

    dataLayer.push({
        "event": "Load Time Total",
        "eventCategory": "Page Load Time",
        "eventAction": navigationType,
        "eventLabel": totalResources + "," + resourceCount + " - " + domNodes + " - " + totalLoadTime.join("|"), // Total resources, Amount of resources by type, DOM-Nodes and Performance Metrics of root document
        "eventValue": totalLoadTime[totalLoadTime.length - 1] * 1000, // Total Load Time in thousands as GA cuts floats to integer
        "nonInteractive": 1
    });

    if (resourceList !== undefined) {
        //console.log(resourceContribution.join("|"));
        //calcResourceContribution();
        //console.log(resourceContribution.join("|"));
        roundResourceDuration();
        //console.log(resourceContribution.join("|"));

        // Category: Load Time Resource, Action: initiatorTypes + resourceRegEx, Label: resourceList[i].name, Value resourceList[i].duration/1000
        dataLayer.push({
            "event": "Load Time Total Resource",
            "eventCategory": "Load Time Resource",
            "eventAction": "Resource details",
            "eventLabel": resourceContribution.join("|"),
            "eventValue": totalLoadTime[totalLoadTime.length - 1] * 1000,
            "nonInteractive": 1
        });
    }

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
    function resourceDetails() {
        //console.log("totalresourceRegEx");
        for (i = 0; i < resourceList.length; i++) {
            //console.log("\n\n=================\n" + "resourceList: " + i + "\n" + resourceList[i].name);

            var resource = resourceList[i],
                resourceDomain = (resource.name != "about:blank") ? resource.name.match(/\b((xn--)?[a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}\b/i)[0] : "X-domain-iframe-fallback.com",
                resourceInitiator = resource.initiatorType,
                resourceExtension = (resource.name.match(/(?:\.)([A-Za-z0-9]{2,5})($|\?)/)) ? resource.name.match(/(?:\.)([A-Za-z0-9]{2,5})($|\?)/)[1] : undefined;

            //console.log("resourceDomain: " + resourceDomain + "\nresourceInitiator: " + resourceInitiator + "\nresourceExtension: " + resourceExtension);

            // Define Origin of Resource
            if (documentDomain === resourceDomain) {
                origin = 0; // Same origin
            } else if (new RegExp(documentDomain.replace(/^www\./, ''), "i").test(resourceDomain)) {
                origin = 1; // Sub domain
            } else {
                origin = 2; // Cross domain
            }
            //console.log("origin: " + origin);

            // Count resource types
            for (p = 0; p < resourceRegEx.length; p++) {
                if (resourceExtension === undefined) {
                    resourceCount[5]++; // Fallback for resources w/o extension
                    resourceType = 5;
                    //console.log("undefined resourceType: " + resourceType);
                    break;
                } else if (resourceExtension.match(resourceRegEx[p])) {
                    resourceCount[p]++;
                    resourceType = p;
                    //console.log("else resourceType: " + p);
                    break;
                }

            }

            // Define Initiator Type
            initType = (initTypes.indexOf(resourceInitiator) === -1) ? 5 : initTypes.indexOf(resourceInitiator);
            //console.log("initType: " + initType);

            // Count specific resource and sum contribution of total load time
            if (resourceContribution[origin][resourceType][initType][0] === undefined) {
                resourceContribution[origin][resourceType][initType][0] = 1;
                resourceContribution[origin][resourceType][initType][1] = resource.duration;
            } else {
                resourceContribution[origin][resourceType][initType][0]++;
                resourceContribution[origin][resourceType][initType][1] += resource.duration;
            }

            // Count cache misses
            //resourceContribution[origin][initType][resourceType][3] = (resource.startTime === resource.connectStart === resource.connectEnd) ? ++ : ; // Three way comparision causes false

            // Count redirects
            //resourceContribution[origin][initType][resourceType][4] = (resource.redirectStart > 0) ? ++ : ;

            // Count mixed protocols!!!
            //resourceContribution[origin][initType][resourceType][5] = ((performance.timing.secureConnectionStart != 0 && resource.secureConnectionStart = 0) || (performance.timing.secureConnectionStart = 0 && resource.secureConnectionStart != 0)) ? ++ : ;

            // Calculate contribution of resource duration in 4th array position
        }
    }

    // Deactivated due to unconvinient lable length
    // Valculated in spreadsheets by event value
    /*function calcResourceContribution() {
      //console.log("\n\n=================\ncalcResourceContribution");
      for (var i = 0; i < resourceContribution.length; i++) {
        for (var j = 0; j < resourceContribution[i].length; j++) {
          for (var k = 0; k < resourceContribution[i][j].length; k++) {
            if (resourceContribution[i][j][k][1] != undefined) {
              //console.log("\n\nif clause i: " + i + "\nj: " + j + "\nk: " + k);
              //console.log("if clause: " + resourceContribution[i][j][k][1]);
              resourceContribution[i][j][k][2] = parseFloat((resourceContribution[i][j][k][1] / (totalLoadTime[totalLoadTime.length - 1] * 10)).toFixed(2)); // Relative duration contribution to total load time in percent
            }
          }
        }
      }
    }*/

    function roundResourceDuration() {
        for (var i = 0; i < resourceContribution.length; i++) {
            for (var j = 0; j < resourceContribution[i].length; j++) {
                for (var k = 0; k < resourceContribution[i][j].length; k++) {
                    if (resourceContribution[i][j][k][1] !== undefined) {
                        resourceContribution[i][j][k][1] = parseFloat(resourceContribution[i][j][k][1].toFixed(0)); // Total resource duration in millisecond
                    }
                }
            }
        }
    }
</script>
