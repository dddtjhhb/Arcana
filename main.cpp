#include <iostream>
#include <string>
#include <vector>
#include <limits>
#include "Card.h"
#include "DeckList.h"
#include "CardHashTable.h"
#include "CardGraph.h"
#include "HistoryStack.h"
#include "RequestQueue.h"
#include "CategoryTree.h"

void initializeData(DeckList& deck, CardHashTable& hashDB, CardGraph& graph, CategoryTree& tree) {
    std::vector<Card> majorArcana = {
        {"The Fool", "Major Arcana", "Embarking on a spontaneous new journey with boundless optimism, trusting the universe and embracing absolute freedom.", "Acting with reckless abandon, ignoring vital warnings, or holding back out of deep-seated fear and anxiety."},
        {"The Magician", "Major Arcana", "Harnessing cosmic power to manifest your deepest desires, utilizing all available resources and pure willpower.", "Manipulating others for personal gain, suffering from poor planning, or experiencing a severe creative block."},
        {"The High Priestess", "Major Arcana", "Tapping into profound intuition and subconscious wisdom, urging you to look beyond the obvious veil of reality.", "Keeping toxic secrets, feeling disconnected from your inner voice, or ignoring your own intuitive guidance."},
        {"The Empress", "Major Arcana", "Basking in maternal nurturing and natural abundance, representing the creation of life, art, or new deep connections.", "Suffering from an overbearing dependence, smothering others, or experiencing a creative and emotional drought."},
        {"The Emperor", "Major Arcana", "Establishing firm authority and logical structure, bringing stability and solid foundations to chaotic situations.", "Exercising tyranny and absolute rigidity, dominating others aggressively, or lacking the discipline to succeed."},
        {"The Hierophant", "Major Arcana", "Following traditional values and conventional wisdom, seeking spiritual guidance from established institutions or mentors.", "Rebelling blindly against society, feeling restricted by dogmatic rules, or following a subversively toxic leader."},
        {"The Lovers", "Major Arcana", "Experiencing harmonious partnerships and deep soul connections, aligning your personal values with a meaningful choice.", "Suffering from imbalance and misalignment in a relationship, or making choices based on fear rather than love."},
        {"The Chariot", "Major Arcana", "Overcoming severe conflicts and achieving victory through sheer willpower, intense focus, and strict self-control.", "Experiencing a complete lack of direction, losing control of opposing forces, or encountering aggressive opposition."},
        {"Strength", "Major Arcana", "Taming the inner beast with quiet courage, infinite compassion, and gentle persuasion rather than brute force.", "Struggling with intense self-doubt, letting raw emotions control your actions, or feeling profound inner weakness."},
        {"The Hermit", "Major Arcana", "Retreating from the noisy world for soul-searching and deep introspection, guided by your own internal light.", "Falling into toxic isolation and profound loneliness, or refusing to return to the world after a period of healing."},
        {"Wheel of Fortune", "Major Arcana", "Experiencing a positive turning point, realizing that karma and cosmic cycles are naturally working in your favor.", "Facing a relentless streak of bad luck, feeling entirely out of control, or resisting the natural ebb and flow of life."},
        {"Justice", "Major Arcana", "Seeking absolute fairness and truth, knowing that objective decisions and karmic balance will ultimately prevail.", "Suffering from severe dishonesty, facing unaccountability, or experiencing a deeply unfair situation and legal trouble."},
        {"The Hanged Man", "Major Arcana", "Willingly surrendering to a temporary pause, gaining a revolutionary new perspective through sacrifice and letting go.", "Experiencing endless delays, resisting necessary changes, or making meaningless sacrifices that yield no real results."},
        {"Death", "Major Arcana", "Undergoing a profound transformation and necessary endings, clearing out the old to make way for a completely new life.", "Living in constant fear of change, experiencing painful stagnation, or refusing to let go of toxic attachments."},
        {"Temperance", "Major Arcana", "Finding perfect balance and moderation, patiently blending opposing forces to create profound spiritual alchemy.", "Suffering from extreme imbalance and excess, rushing into reckless decisions, or experiencing harsh disharmony."},
        {"The Devil", "Major Arcana", "Facing unhealthy addictions and materialistic restrictions, exploring the shadow self and hidden carnal desires.", "Detaching gracefully from toxic bonds, breaking free from mental prisons, and overcoming a long-term addiction."},
        {"The Tower", "Major Arcana", "Surviving sudden upheaval and disastrous revelations that violently tear down false foundations to rebuild the truth.", "Narrowly avoiding a massive disaster, delaying the inevitable collapse, or fearing the pain of sudden awakening."},
        {"The Star", "Major Arcana", "Finding renewed hope and profound spiritual inspiration, experiencing deep healing and cosmic guidance after a storm.", "Drowning in intense despair and discouragement, losing faith in the universe, or feeling completely disconnected."},
        {"The Moon", "Major Arcana", "Navigating through illusions and deep subconscious fears, relying on intuition to find the way through the dark unknown.", "Releasing deeply repressed emotions, finally seeing the truth behind a deception, or overcoming paralyzing anxiety."},
        {"The Sun", "Major Arcana", "Basking in ultimate positivity and radiant success, experiencing pure joy, profound vitality, and absolute clarity.", "Feeling temporary sadness, being overly optimistic to the point of blindness, or struggling to see the bright side."},
        {"Judgement", "Major Arcana", "Hearing the higher inner calling and experiencing a spiritual rebirth, ready to rise up and absolve past mistakes.", "Ignoring a vital cosmic wake-up call, drowning in harsh self-doubt, or refusing to learn from past karmic lessons."},
        {"The World", "Major Arcana", "Achieving absolute completion and successful integration, feeling a sense of ultimate wholeness and triumphant closure.", "Suffering from a frustrating lack of closure, experiencing delayed success, or feeling an empty void despite reaching the goal."}
    };

    auto root = tree.getRoot();
    auto majorNode = std::make_shared<TreeNode>("Major Arcana");
    auto minorNode = std::make_shared<TreeNode>("Minor Arcana");
    root->addChild(majorNode);
    root->addChild(minorNode);

    for (const auto& c : majorArcana) {
        deck.addCard(c);
        hashDB.insert(c);
        graph.addNode(c.name);
        majorNode->addChild(std::make_shared<TreeNode>(c.name));
    }

    graph.addEdge("The Fool", "The Magician", "The transition from pure potential into tangible action.");
    graph.addEdge("The Fool", "The World", "The Alpha and Omega: Start and End of the spiritual journey.");
    graph.addEdge("The High Priestess", "The Hierophant", "The balance between inner intuitive truth and outer traditional dogma.");
    graph.addEdge("The Empress", "The Emperor", "The divine union of feminine nurturing abundance and masculine rigid structure.");
    graph.addEdge("The Lovers", "The Devil", "The contrast between free, harmonious choice and toxic, addictive bondage.");
    graph.addEdge("Strength", "The Chariot", "The difference between soft, compassionate inner control and hard, forceful outer control.");
    graph.addEdge("Justice", "Judgement", "The evolution from earthly cause-and-effect to profound spiritual rebirth and absolution.");
    graph.addEdge("The Hermit", "The Star", "The shift from seeking wisdom inwardly in the dark to radiating hope outwardly to the world.");
    graph.addEdge("Death", "The Tower", "The contrast between natural, gradual transformation and sudden, violent upheaval.");
    graph.addEdge("The Moon", "The Sun", "The journey from subconscious fear and dark illusions into conscious success and radiant clarity.");

    std::vector<std::string> suits = {"Wands", "Cups", "Swords", "Pentacles"};
    std::vector<std::string> ranks = {"Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"};
    
    std::vector<std::string> rankUprightDesc = {
        "A sudden spark of pure potential and new beginnings in the realm of ",
        "Finding balance, making crucial choices, and forming meaningful partnerships regarding ",
        "Experiencing initial growth, creative expansion, and the power of teamwork in ",
        "Establishing deep stability, solid foundations, and a sense of security in ",
        "Facing sudden conflict, unexpected changes, and necessary challenges involving ",
        "Achieving beautiful harmony, generous cooperation, and a sense of victorious restoration in ",
        "Taking time for deep assessment, strategic reflection, and spiritual growth regarding ",
        "Demonstrating intense mastery, rapid movement, and overcoming massive obstacles in ",
        "Reaching a state of independent fruition, profound culmination, and near-completion in ",
        "Celebrating the absolute completion of a cycle and ultimate manifestation of ",
        "Embracing youthful curiosity, receiving exciting news, and adopting a fresh perspective on ",
        "Taking bold, romantic, or intellectual action with swift and passionate momentum toward ",
        "Mastering emotional or practical maturity, nurturing others, and radiating the confident energy of ",
        "Exercising supreme authority, absolute control, and deeply respected leadership in the domain of "
    };
    
    std::vector<std::string> rankRevDesc = {
        "Experiencing blocked potential, severe delays, or a squandered opportunity in the realm of ",
        "Suffering from deep disharmony, painful breakups, or an inability to make a choice regarding ",
        "Facing creative blocks, failed teamwork, or a painful lack of necessary expansion in ",
        "Struggling with intense instability, shattered foundations, or a terrifying loss of security in ",
        "Avoiding necessary conflict, lingering in post-chaos trauma, or resolving long-standing challenges involving ",
        "Dealing with unfairness, lack of support, deep-seated pride, or failing to achieve harmony in ",
        "Suffering from strategic exhaustion, paralyzing hesitation, or refusing to learn life lessons regarding ",
        "Feeling deeply trapped, experiencing agonizing delays, or lacking the focus needed to overcome obstacles in ",
        "Experiencing painful burnout, stubborn isolation, or a tragic failure right before the finish line in ",
        "Carrying a crushing burden, facing an anti-climactic ending, or desperately avoiding the inevitable closure of ",
        "Acting with intense immaturity, receiving devastating news, or lacking the necessary focus regarding ",
        "Displaying reckless impulsivity, aggressive arrogance, or losing complete momentum toward ",
        "Becoming emotionally manipulative, overly dependent, or projecting toxic insecurity in the energy of ",
        "Exercising tyrannical control, strict ruthlessness, or completely losing your rightful authority in the domain of "
    };

    std::vector<std::string> numerologyLinks = {
        "None", "The Magician", "The High Priestess", "The Empress", "The Emperor", 
        "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit", "Wheel of Fortune"
    };

    for (const auto& suit : suits) {
        auto suitNode = std::make_shared<TreeNode>(suit);
        minorNode->addChild(suitNode);

        for (size_t i = 0; i < ranks.size(); ++i) {
            std::string name = ranks[i] + " of " + suit;
            std::string upMeaning = rankUprightDesc[i] + suit + ".";
            std::string revMeaning = rankRevDesc[i] + suit + ".";
            
            Card c(name, "Minor Arcana", upMeaning, revMeaning);
            deck.addCard(c);
            hashDB.insert(c);
            graph.addNode(c.name);
            suitNode->addChild(std::make_shared<TreeNode>(c.name));

            if (i < 10) {
                std::string majorMatch = numerologyLinks[i + 1];
                std::string meaning = "Numerology Link: Carrying the base energy of " + std::to_string(i + 1);
                graph.addEdge(majorMatch, c.name, meaning);
            }
        }
    }
}

void printMenu() {
    std::cout << "\n===================================================\n";
    std::cout << "    ARCANA: TAROT KNOWLEDGE SYSTEM (78 CARDS)\n";
    std::cout << "===================================================\n";
    std::cout << "  1. Perform Tarot Reading (List -> Stack)\n";
    std::cout << "  2. Search Card Database (Hash Table O(1))\n";
    std::cout << "  3. Explore Similar Cards (Graph BFS Traversal)\n";
    std::cout << "  4. View & Undo History (Stack LIFO)\n";
    std::cout << "  5. Ask Questions & Draw (Queue FIFO + Auto Draw)\n";
    std::cout << "  6. Browse Card Categories (Tree Traversal)\n";
    std::cout << "  7. Exit System\n";
    std::cout << "===================================================\n";
    std::cout << "Select an option (1-7): ";
}

int main() {
    DeckList deck;
    CardHashTable hashDB;
    CardGraph graph;
    HistoryStack history;
    RequestQueue queue;
    CategoryTree tree;

    initializeData(deck, hashDB, graph, tree);

    int choice = 0;
    while (true) {
        printMenu();
        
        if (!(std::cin >> choice)) {
            std::cin.clear();
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            continue;
        }

        if (choice == 1) {
            auto drawn = deck.drawCards(3);
            std::cout << "\n--- Drawn 3 Cards ---\n";
            std::string labels[3] = {"Past", "Present", "Future"};
            for (size_t i = 0; i < drawn.size(); ++i) {
                std::string orientation = drawn[i].isReversed ? "[Reversed]" : "[Upright]";
                std::string meaning = drawn[i].isReversed ? drawn[i].baseCard.meaningReversed : drawn[i].baseCard.meaningUpright;
                std::cout << labels[i] << ": " << drawn[i].baseCard.name << " " << orientation << "\n";
                std::cout << "  Meaning: " << meaning << "\n\n";
            }
            history.pushSession(drawn, "Question: General Reading");
        }
        else if (choice == 2) {
            std::cout << "Enter exact card name (e.g., 'The Fool', 'Ace of Wands'): ";
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            std::string name;
            std::getline(std::cin, name);
            const Card* c = hashDB.search(name);
            if (c) {
                std::cout << "\n[O(1) Hash Table Result]\nName: " << c->name << "\nCategory: " << c->category
                          << "\nUpright Meaning: " << c->meaningUpright
                          << "\nReversed Meaning: " << c->meaningReversed << "\n";
            } else {
                std::cout << "Card not found in database. Check spelling/capitalization.\n";
            }
        }
        else if (choice == 3) {
            std::cout << "Enter exact card name to find connections: ";
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            std::string name;
            std::getline(std::cin, name);
            auto related = graph.getRelatedCardsBFS(name);
            std::cout << "\n[BFS Graph Traversal Result]\nConnections for '" << name << "':\n";
            if (related.empty()) std::cout << "  None in current graph.\n";
            for (const auto& r : related) {
                std::cout << "  -> [" << r.first << "] (Reason: " << r.second << ")\n";
            }
            std::cout << "\n";
        }
        else if (choice == 4) {
            history.printHistory();
            std::cout << "\nUndo last reading? (1: Yes / 0: No): ";
            int undo;
            std::cin >> undo;
            if (undo == 1) {
                if (history.popSession()) std::cout << "[Success] Last reading removed from Stack.\n";
                else std::cout << "[Failed] Stack is empty.\n";
            }
        }
        else if (choice == 5) {
            std::cout << "\n--- Your Question Queue (FIFO) ---\n";
            std::cout << "1. Add a custom question to your queue\n";
            std::cout << "2. Focus on the next question (Dequeue & Auto-Draw)\n";
            std::cout << "3. View all queued questions\n";
            std::cout << "Choice: ";
            int qChoice;
            std::cin >> qChoice;
            
            if (qChoice == 1) {
                std::cout << "Enter your specific question: ";
                std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
                std::string customQuestion;
                std::getline(std::cin, customQuestion);
                queue.enqueueRequest(customQuestion);
            } 
            else if (qChoice == 2) {
                if (!queue.requests.empty()) {
                    
                    std::string currentQuestion = queue.requests.front().requestType;
                    if (queue.processNextRequest()) {
                        std::cout << "\n>>> Question focused! Do you want to draw 3 cards for this right now? (1: Yes / 0: No): ";
                        int autoDraw;
                        std::cin >> autoDraw;
                        
                        if (autoDraw == 1) {
                            auto drawn = deck.drawCards(3);
                            std::cout << "\n--- Drawn 3 Cards for your Question ---\n";
                            std::string labels[3] = {"Past", "Present", "Future"};
                            for (size_t i = 0; i < drawn.size(); ++i) {
                                std::string orientation = drawn[i].isReversed ? "[Reversed]" : "[Upright]";
                                std::string meaning = drawn[i].isReversed ? drawn[i].baseCard.meaningReversed : drawn[i].baseCard.meaningUpright;
                                std::cout << labels[i] << ": " << drawn[i].baseCard.name << " " << orientation << "\n";
                                std::cout << "  Meaning: " << meaning << "\n\n";
                            }
                            history.pushSession(drawn, "Question: " + queue.requests.front().requestType);
                        }
                    }
                }
            } 
            else if (qChoice == 3) {
                queue.printQueue();
            }
        }
        else if (choice == 6) {
            tree.printTree();
        }
        else if (choice == 7) {
            std::cout << "Exiting Arcana System. Goodbye!\n";
            break;
        }
    }
    return 0;
}