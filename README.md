# HTML5 Performance Events in Google Analytics with Google Tag Manager
Leveraging HTML5 [Navigation Timing](https://www.w3.org/TR/navigation-timing/) and [Resource Timing API](https://www.w3.org/TR/resource-timing/) natively build into browser. Providing high resolution time stamps and exceeding accuracy of approx. more than 70% compared to Google's 1%.

## Support of HTML5 Navigation and Resource Timing API
| Browser | [Navigation Timing API](https://caniuse.com/#feat=nav-timing) | [Resource Timing API](https://caniuse.com/#feat=resource-timing) |
| ------------- | ------------- | ------------- |
| Internet Explorer | 10+ | 9+ |
| Edge | 12+ | 12+ |
| Firefox | 35+ | 7+ |
| Chrome | 25+ | 6+ |
| Safari | 11+ | 8+ |
| iOS Safari | 11+ | 9.2+ |
| Opera | 15+ | 15+ |
| Android Browser | 4.4+ | 4+ |

## Resources to start with HTML5 Navigation and Resource Timing API
* [HTML5 Rocks](https://www.html5rocks.com/en/tutorials/webperformance/basics/)
* [Wikipedia – Perceived performance](https://en.wikipedia.org/wiki/Perceived_performance)
* [Smashing Magazine – Why Perceived Performance Matters](https://www.smashingmagazine.com/2015/09/why-performance-matters-the-perception-of-time/)
* [Google – Critical Rendering Path](https://developers.google.com/web/fundamentals/performance/critical-rendering-path/analyzing-crp)
* [Steve Souders - Resource Timing practical tips](http://www.stevesouders.com/blog/2014/11/25/serious-confusion-with-resource-timing/)
* [sitepoint - Introduction to the Resource Timing API](http://www.sitepoint.com/introduction-resource-timing-api/)
* [Patrick Sexton](https://plus.google.com/collection/swMUSB)

## Use cases of HTML5 Performance Events in Google Analytics
* API's supported by majority of browsers
* Native / Vanilla JavaScript without any library dependency i.e. like jQuery
* No third party and their associated fees
* High precision of page load performance as GA event value
* Circumventing 1% sampling of Google Analytics
* Higher significance even on low traffic sites or when viewing a section of a website
* Real time user waited since requesting a page (check out )
* Wealth of information about each network hop
![W3C Processing Model of Performance Timing and Navigation API](https://www.w3.org/TR/navigation-timing/timing-overview.png)

### Why not using Google Analytics build in [Site Speed Analysis](https://support.google.com/analytics/answer/1205784?hl=en)?
1. Significance issue: Speed metrics of a mere 1% of your users are collected
2. Details: Important details where delays may triggered missing (Server, network or client side delays)

Note: Sampling rate can be increased but still remains with up to ten percent way below what's actually possible! To increase sampling rate check the [GA-Documentation](https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#siteSpeedSampleRate).

## What information / insights does the Google Analytics Event provide?
Note: there are two events generated, "Page Load Time" and "Load Time Total Resource", which are explained as follows.

### Event Category "Page Load Time"
Load speed information of the viewed page

#### Event Action
* [Type of navigation](https://www.w3.org/TR/navigation-timing/#performancenavigation)
⋅⋅* 0 Navigate
⋅⋅* 1 Reload
⋅⋅* 2 History change
⋅⋅* 255 Undefined
* Initial (App Cache used, performance.timing.domainLookupStart equals performance.timing.fetchStart)
* Count of redirects (if any)
* Mark SSL connection (if SSL used in page protocol)
* Count of resources
* Count of XHR's (if any, bound to hashChange)

##### Examples for event action
Regular navigation with leveraging browser cache: `0 Navigate`
Regular navigation with leveraging browser cache and one redirect: `0 Navigate 1`
Regular navigation with leveraging browser cache with SSL: `0 Navigate 1 SSL`
Regular navigation with leveraging browser cache, one redirect, SSL and one XHR: `0 Navigate 1 SSL XHR 1`

#### Event Label
Note: This represents raw data, all details collected in an array! It's purpose is to analyze all details by doing sophisticated data mining i.e. with [KNIME Analytics Platform](https://www.knime.com/knime-analytics-platform).
* Total amount of loaded resources
* Count of resource type (img, css, js, font, doc, fallback)
* Count of DOM-Nodes (indicating complex documents limiting UX with high rendering times)
* Required time for each timing event since navigation start

##### Examples for event label
0,0,0,0,0,0,0 - 1788 - 0|0|0.053|0.004|0.036|0|2.033|2.199|0.33|0.887|0|3.25|0.554|-1507571697.364|0|-1507571696.81|6.512
Explanation
* "0,0,0,0,0,0,0" No support of resource API
* "1788" DOM Nodes
* "0|0|0.053|0.004|0.036|0|2.033|2.199|0.33|0.887|0|3.25|0.554|-1507571697.364|0|-1507571696.81|6.512" whole array of timing events with milestones "Network Latency", "DOM & CSSDOM parsed" and "Page completed" as well as total load time since navigation start

Note: Strong negatives like "-1507571697.364" show that the end event (i.e. performance.timing.domComplete - performance.timing.domContentLoadedEventEnd) did not finished upon script execution indicating "blocking" resources

### Event Category "Load Time Total Resource"
Resource load speed information of the viewed page. No insights won't be gained without data mining here … except based on the avg. event value in combination with [GA Content Grouping](https://support.google.com/analytics/answer/2853423?hl=en).

Omitting event action as it simply "Resource details"

#### Event label
A joined string of a multi-dimensional array to count resources and sum their load time based on:
1. Domain
2. Initiator
3. Resource type (extension)

Note: I won't go into details as I created this for the sake of completeness. In Google Analytics, when properly done, you can link the "Page Load Time" with the "Load Time Total Resource" event to check if a resource of the origin or foreign domain caused the delay. Or, on a higher level, analyze the resources of a certain page or type of page (i.e. category, product or checkout).

Example label: `,,,,,,,,,,1,1402,1,87,,,,,,,,,,,,,,,1,193,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,|,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,|,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,1,309,,,,,,,,`

## Prerequisites
None, except you want to use a tagging system like [Google Tag Manager](https://www.google.com/analytics/tag-manager/)

## What does the HTML5 Performance script do?
A lot but to keep it simple:
1. Created an event listener for hashChange
2. Collect information from [Navigation Timing API](https://www.w3.org/TR/navigation-timing/) and [Resource Timing API](https://www.w3.org/TR/resource-timing/)
3. Calculates performance metric timings
4. Calculates resources timings
5. Constructs the GA-Event
6. Pushes the data into the data layer of Google tag Manager

### Installing
1. Download the script
2. Embed it in the website or in the Tag Manager of choice
3. Create a loading trigger. I recommend [window.onload](https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onload) as all sub-resources should have finished loading

## Versioning
0.2 Current Release
* Added readme
* Added MIT license
* Cleaned tracking script

0.1 Initialization

## To be done ##
1. Adding the Knime workflow in a separate repo
2. Elaborate to gain more insights from the resource event like cache misses, resource redirects, mixed protocols or "broken" resources responding with 404 or even 5xx
3. Send a separate event for resources identified being a blocker during this load with detailed information about it's resource timings
![W3C Processing Model of Resource Timing API](https://www.w3.org/TR/resource-timing/resource-timing-overview-1.png)

## Authors
**Mike Wiegand** - [atMedia Online Marketing](https://atmedia-marketing.com)

See also the list of [Acknowledgments](#Acknowledgments) where their work greatly contributed to this project.

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments
* [Steve Field](https://uk.linkedin.com/in/steve-field-8a7b891) for the function to dynamically attach the hashChange event lister
* [Matthew Crumley](http://stackoverflow.com/questions/966225/how-can-i-create-a-two-dimensional-array-in-javascript) for dynamically / efficiently creating a multi-dimensional array
