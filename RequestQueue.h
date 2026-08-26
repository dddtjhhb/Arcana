#ifndef REQUEST_QUEUE_H
#define REQUEST_QUEUE_H

#include <queue>
#include <string>
#include <iostream>

struct ReadingRequest {
    int requestId;
    std::string requestType;
};

class RequestQueue {
private:
   
    int nextReqId = 101;

public:
    std::queue<ReadingRequest> requests;
    void enqueueRequest(const std::string& type) {
        requests.push({nextReqId++, type});
        std::cout << "Enqueued request #" << (nextReqId - 1) << " (" << type << ")\n";
    }

    bool processNextRequest() {
        if (requests.empty()) {
            std::cout << "Queue is empty.\n";
            return false;
        }
        auto req = requests.front();
        requests.pop();
        std::cout << "Processing Request #" << req.requestId << " [" << req.requestType << "]\n";
        return true;
    }

    void printQueue() {
        if (requests.empty()) {
            std::cout << "Queue is empty.\n";
            return;
        }
        std::queue<ReadingRequest> temp = requests;
        std::cout << "\n--- Pending Requests ---\n";
        while (!temp.empty()) {
            auto r = temp.front();
            temp.pop();
            std::cout << " -> Request #" << r.requestId << ": " << r.requestType << "\n";
        }
    }
};

#endif