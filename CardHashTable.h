#ifndef CARD_HASH_TABLE_H
#define CARD_HASH_TABLE_H

#include "Card.h"
#include <unordered_map>
#include <string>

class CardHashTable {
private:
    std::unordered_map<std::string, Card> table;

public:
    void insert(const Card& card) {
        table[card.name] = card;
    }

    const Card* search(const std::string& cardName) const {
        auto it = table.find(cardName);
        if (it != table.end()) {
            return &(it->second);
        }
        return nullptr;
    }
};

#endif