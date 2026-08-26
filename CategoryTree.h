#ifndef CATEGORY_TREE_H
#define CATEGORY_TREE_H

#include <string>
#include <vector>
#include <iostream>
#include <memory>

struct TreeNode {
    std::string name;
    std::vector<std::shared_ptr<TreeNode>> children;

    TreeNode(std::string n) : name(n) {}

    void addChild(std::shared_ptr<TreeNode> child) {
        children.push_back(child);
    }
};

class CategoryTree {
private:
    std::shared_ptr<TreeNode> root;

    void printTreeHelper(std::shared_ptr<TreeNode> node, int depth) const {
        if (!node) return;
        for (int i = 0; i < depth; ++i) std::cout << "  ";
        std::cout << "|-- " << node->name << "\n";
        for (const auto& child : node->children) {
            printTreeHelper(child, depth + 1);
        }
    }

public:
    CategoryTree() {
        root = std::make_shared<TreeNode>("Tarot Deck");
    }

    std::shared_ptr<TreeNode> getRoot() { return root; }

    void printTree() const {
        std::cout << "\n--- Card Category Hierarchy ---\n";
        printTreeHelper(root, 0);
    }
};

#endif