#ifndef DECK_LIST_H
#define DECK_LIST_H

#include "Card.h"
#include <vector>
#include <algorithm>
#include <random>
#include <chrono>

class DeckList {
private:
    std::vector<Card> deck;

public:
    void addCard(const Card& card) {
        deck.push_back(card);
    }

    std::vector<DrawnCard> drawCards(size_t count = 3) {
        if (deck.empty()) return {};

        std::vector<Card> shuffled = deck;
        unsigned seed = std::chrono::system_clock::now().time_since_epoch().count();
        std::shuffle(shuffled.begin(), shuffled.end(), std::default_random_engine(seed));

        size_t drawCount = std::min(count, shuffled.size());
        std::vector<DrawnCard> result;

        std::mt19937 gen(seed);
        std::uniform_int_distribution<> dis(0, 1);

        for (size_t i = 0; i < drawCount; ++i) {
            bool reversed = (dis(gen) == 1);
            result.push_back({shuffled[i], reversed});
        }
        return result;
    }

    const std::vector<Card>& getAllCards() const { 
        return deck; 
    }
};

#endif
