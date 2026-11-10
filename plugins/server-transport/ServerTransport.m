#import <Foundation/Foundation.h>
#import <WebKit/WebKit.h>
#import <React/RCTBridgeModule.h>

@interface ServerTransport : NSObject <RCTBridgeModule, NSURLSessionDataDelegate, NSURLSessionTaskDelegate>
@property (nonatomic, strong) NSURLSession *session;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSMutableDictionary *> *requests;
@end

@implementation ServerTransport
RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup { return NO; }

- (instancetype)init {
  if ((self = [super init])) {
    _requests = [NSMutableDictionary new];
    NSURLSessionConfiguration *config = [NSURLSessionConfiguration ephemeralSessionConfiguration];
    config.HTTPCookieStorage = nil;
    config.HTTPShouldSetCookies = NO;
    config.URLCache = nil;
    config.timeoutIntervalForRequest = 10;
    config.timeoutIntervalForResource = 10;
    NSOperationQueue *queue = [NSOperationQueue new];
    queue.maxConcurrentOperationCount = 1;
    _session = [NSURLSession sessionWithConfiguration:config delegate:self delegateQueue:queue];
  }
  return self;
}

RCT_REMAP_METHOD(discover, discover:(NSString *)urlString requestId:(NSString *)requestId
                 resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  NSURL *url = [NSURL URLWithString:urlString];
  if (!url || !url.host || ![@[@"https", @"http"] containsObject:url.scheme.lowercaseString]) {
    reject(@"SERVER_VALIDATION", @"Invalid server URL", nil); return;
  }
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
  request.HTTPShouldHandleCookies = NO;
  [request setValue:@"application/json" forHTTPHeaderField:@"Accept"];
  NSURLSessionDataTask *task = [self.session dataTaskWithRequest:request];
  @synchronized (self.requests) {
    if (self.requests[requestId]) { reject(@"SERVER_VALIDATION", @"Duplicate request", nil); return; }
    self.requests[requestId] = [@{@"task": task, @"data": [NSMutableData new],
                                   @"resolve": [resolve copy], @"reject": [reject copy]} mutableCopy];
  }
  [task resume];
}

RCT_EXPORT_METHOD(cancelDiscovery:(NSString *)requestId) {
  @synchronized (self.requests) { [self.requests[requestId][@"task"] cancel]; }
}

- (NSMutableDictionary *)entryForTask:(NSURLSessionTask *)task key:(NSString **)key {
  for (NSString *candidate in self.requests) {
    if (self.requests[candidate][@"task"] == task) {
      if (key) *key = candidate;
      return self.requests[candidate];
    }
  }
  return nil;
}

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task
 willPerformHTTPRedirection:(NSHTTPURLResponse *)response newRequest:(NSURLRequest *)request
 completionHandler:(void (^)(NSURLRequest *))completionHandler { completionHandler(nil); }

- (void)URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)task didReceiveData:(NSData *)data {
  @synchronized (self.requests) {
    NSMutableDictionary *entry = [self entryForTask:task key:nil];
    NSMutableData *body = entry[@"data"];
    if (body.length + data.length > 1024 * 1024) {
      entry[@"tooLarge"] = @YES;
      [task cancel];
    } else { [body appendData:data]; }
  }
}

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *)error {
  NSMutableDictionary *entry;
  @synchronized (self.requests) {
    NSString *key = nil;
    entry = [self entryForTask:task key:&key];
    if (key) [self.requests removeObjectForKey:key];
  }
  if (!entry) return;
  NSHTTPURLResponse *response = (NSHTTPURLResponse *)task.response;
  NSString *body = [[NSString alloc] initWithData:entry[@"data"] encoding:NSUTF8StringEncoding];
  RCTPromiseRejectBlock reject = entry[@"reject"];
  RCTPromiseResolveBlock resolve = entry[@"resolve"];
  if (error || entry[@"tooLarge"] || ![response isKindOfClass:[NSHTTPURLResponse class]] ||
      (response.statusCode != 200 && response.statusCode != 405) || !body) {
    reject(@"SERVER_VALIDATION", @"Unable to validate server", error); return;
  }
  resolve(@{@"status": @(response.statusCode), @"body": body});
}

RCT_REMAP_METHOD(clearCookies, clearCookiesWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    NSHTTPCookieStorage *storage = NSHTTPCookieStorage.sharedHTTPCookieStorage;
    for (NSHTTPCookie *cookie in storage.cookies) [storage deleteCookie:cookie];
    WKWebsiteDataStore *store = WKWebsiteDataStore.defaultDataStore;
    [store removeDataOfTypes:[NSSet setWithObject:WKWebsiteDataTypeCookies]
               modifiedSince:[NSDate distantPast] completionHandler:^{ resolve(nil); }];
  });
}
@end
