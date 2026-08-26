#ifndef CARD_GRAPH_H
#define CARD_GRAPH_H

#include <string>
#include <vector>
#include <unordered_map>
#include <queue>
#include <unordered_set>
#include <utility>

class CardGraph {
private:
    std::unordered_map<std::string, std::vector<std::pair<std::string, std::string>>> adjList;

public:
    void addNode(const std::string& cardName) {
        if (adjList.find(cardName) == adjList.end()) {
            adjList[cardName] = std::vector<std::pair<std::string, std::string>>();
        }
    }


    void addEdge(const std::string& u, const std::string& v, const std::string& meaning) {
        adjList[u].push_back({v, meaning});
        adjList[v].push_back({u, meaning});
    }

    std::vector<std::pair<std::string, std::string>> getRelatedCardsBFS(const std::string& startCard) {
        std::vector<std::pair<std::string, std::string>> related;
        if (adjList.find(startCard) == adjList.end()) return related;

        std::queue<std::string> q;
        std::unordered_set<std::string> visited;

        q.push(startCard);
        visited.insert(startCard);

        while (!q.empty()) {
            std::string current = q.front();
            q.pop();

            for (const auto& neighbor : adjList[current]) {
                if (visited.find(neighbor.first) == visited.end()) {
                    visited.insert(neighbor.first);
                    q.push(neighbor.first);
                    related.push_back({neighbor.first, neighbor.second});
                }
            }
        }
        return related;
    }
};

#endif