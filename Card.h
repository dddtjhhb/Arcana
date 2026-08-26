#ifndef CARD_H
#define CARD_H

#include <string>

struct Card {
    std::string name;
    std::string category;
    std::string meaningUpright;
    std::string meaningReversed;

    Card() = default;
    Card(std::string n, std::string cat, std::string up, std::string rev)
        : name(n), category(cat), meaningUpright(up), meaningReversed(rev) {}
};

struct DrawnCard {
    Card baseCard;
    bool isReversed;
};

#endif