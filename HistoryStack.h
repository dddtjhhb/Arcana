#ifndef HISTORY_STACK_H
#define HISTORY_STACK_H

#include "Card.h"
#include <stack>
#include <vector>
#include <string>
#include <iostream>

struct ReadingSession {
    int id;
    std::string timestamp;
    std::vector<DrawnCard> drawnCards;
};

class HistoryStack {
private:
    std::stack<ReadingSession> history;
    int nextId = 1;

public:
    void pushSession(const std::vector<DrawnCard>& cards, const std::string& timeStr) {
        ReadingSession session{nextId++, timeStr, cards};
        history.push(session);
    }

    bool popSession() {
        if (history.empty()) return false;
        history.pop();
        return true;
    }

    void printHistory() {
        if (history.empty()) {
            std::cout << "History Stack is empty.\n";
            return;
        }

        std::stack<ReadingSession> temp = history;
        std::cout << "\n--- Reading History ---\n";
        while (!temp.empty()) {
            auto session = temp.top();
            temp.pop();
            std::cout << "Reading #" << session.id << " [" << session.timestamp << "]:\n";
            for (const auto& dc : session.drawnCards) {
                std::string orientation = dc.isReversed ? "[Reversed]" : "[Upright]";
                std::string meaning = dc.isReversed ? dc.baseCard.meaningReversed : dc.baseCard.meaningUpright;
                std::cout << "  -> " << dc.baseCard.name << " " << orientation << ": " << meaning << "\n";
            }
            std::cout << "\n";
        }
    }
};

#endif