#include <atomic>
#include <iostream>
#include <sstream>
#include <string>
#include<vector>
using namespace std;

//the different gates that we'll need
enum GateType { INPUT, NOT_GATE, AND_GATE, OR_GATE, NAND_GATE, NOR_GATE, XOR_GATE };

string type_name(GateType t) {
	switch (t) {
	case INPUT:
		return "INPUT";
	case NOT_GATE:
		return "NOT";
	case AND_GATE:
		return "AND";
	case OR_GATE:
		return "OR";
	case NAND_GATE:
		return "NAND";
	case NOR_GATE:
		return "NOR";
	case XOR_GATE:
		return "XOR";
	default:
		return "UNKNOWN";
	}
}

void die() {
	cout << "BAD INPUT!\n";
	exit(EXIT_FAILURE);
}

//====================================================
// Gate struct -- represents ONE node: either an input pin
// or a logic gate. Pins and gates share the same array,
// indexed by the order they were created.
//====================================================
struct Gate {
	GateType type;
	int input1 = -1;   // -1 means "not connected" (used for INPUT pins)
	int input2 = -1;   // -1 for NOT gates and INPUT pins (only one or zero inputs)
	int output = -1;   // filled in later: which gate/pin consumes THIS node's output
	bool value = false; // used during truth table evaluation
};

vector<Gate> circuit;
int n; // number of input pins

//====================================================
// Evaluates a single gate given its two input values.
// (For NOT gates, 'b' is simply ignored.)
//====================================================
bool evaluate_gate(GateType type, bool a, bool b) {
	//YOU: implement all six gate operations
	switch (type) {
	case NOT_GATE:
		return !a; //YOU
	case AND_GATE:
		return a && b; //YOU
	case OR_GATE:
		return a || b; //YOU
	case NAND_GATE:
		return !(a && b); //YOU
	case NOR_GATE:
		return !(a || b); //YOU
	case XOR_GATE:
		return a != b; //YOU
	default:
		return false; // unreachable for INPUT
	}
}

//====================================================
// Evaluates the ENTIRE circuit for one combination of
// input values (given as bits of input_bits), and
// returns the final output pin's value.
//====================================================
bool evaluate_circuit(int input_bits) {
	//YOU: set circuit[0..n-1].value from the bits of input_bits
	for (int i = 0; i < n; i++) {
		circuit[i].value = (input_bits >> (n - 1 - i)) & 1;
	}
	//YOU: walk through circuit[n..end], evaluating each gate
	//     using its input1/input2's already-computed .value
	for (int idx = n; idx < (int)circuit.size(); idx++) {
		bool a = circuit[circuit[idx].input1].value;
		bool b = (circuit[idx].input2 != -1) ? circuit[circuit[idx].input2].value : false;
		circuit[idx].value = evaluate_gate(circuit[idx].type, a, b);
	}
	return circuit.back().value; //YOU: return the last gate's value
}

//====================================================
// Fills in every node's .output field, by looking at
// who uses it as an input1 or input2. Needed before
// printing the circuit diagram (not needed for the
// truth table).
//====================================================
void compute_outputs() {
	//YOU: for every gate, mark its input1 and input2's
	//     "output" field to point back at this gate's index
	for (int idx = 0; idx < (int)circuit.size(); idx++) {
		int in1 = circuit[idx].input1;
		int in2 = circuit[idx].input2;
		if (in1 != -1) circuit[in1].output = idx;
		if (in2 != -1) circuit[in2].output = idx;
	}
	circuit.back().output = -2; // sentinel meaning "OUTPUT PIN"
	//YOU: mark the very last gate's output as a special
	//     sentinel (e.g. -2) meaning "OUTPUT PIN"
}

//====================================================
// Reads N and builds the initial input pins.
//====================================================
void build_input_pins() {
	cout << "How many inputs does your logic block have? (1 to 10)\n";
	//YOU: read n, validate 1 <= n <= 10 (die() if not)
	cin >> n;
	if (n < 1 || n > 10) die();

	for (int i = 0; i < n; i++) {
		circuit.push_back({INPUT});
	}   //YOU: push_back n INPUT-type Gates into circuit
}

int read_valid_index() {
	int idx;
	cin >> idx;
	if (idx < 0 || idx >= (int)circuit.size()) die();
	return idx;
}
//====================================================
// Repeatedly prompts for gates until the user enters
// DONE (6).
//====================================================
void build_gates() {
	while (true) {
		cout << "What sort of gate do you want to add?\n";
		cout << "0 - NOT, 1 - AND, 2 - OR, 3 - NAND, 4 - NOR, 5 - XOR, 6 - DONE\n";
		int choice;
		cin >> choice;

		if (choice == 6) break; // DONE
		//YOU: validate choice is 0-5, die() otherwise
		if (choice < 0 || choice > 5) die();

		int in1 = -1, in2 = -1;
		if (choice == 0) { // NOT -- single input
			cout << "Give the index for the input:\n";
			//YOU: read in1, validate it's a real existing index (0 <= in1 < circuit.size())
			in1 =  read_valid_index();
		} else {
			cout << "Give the index for the first input:\n";
			//YOU: read in1, validate
			in1 = read_valid_index();
			cout << "Give the index for the second input:\n";
			//YOU: read in2, validate
			in2 = read_valid_index();
		}

		//YOU: push_back a new Gate onto circuit with the
		//     right GateType (matching 'choice') and inputs
		GateType  new_type  = static_cast <GateType>(choice + 1);
		circuit.push_back({new_type, in1, in2});
	}

}

//====================================================
// Prints the circuit diagram, matching the exact format
// from the assignment spec.
//====================================================
void print_circuit() {
	compute_outputs();

	for (int idx = 0; idx < (int)circuit.size(); idx++) {
		//YOU: print "Gate Type: <name>"
		Gate &g = circuit[idx];

		cout << "Gate Type: " << type_name(g.type) << endl;

		cout << "\tInput Connected to Index: ";
		if (g.type == INPUT) {
			cout << "N.C. and N.C.";
		} else if (g.type == NOT_GATE) {
			cout << g.input1;
		} else {
			cout << g.input1 << " and " << g.input2;
		}
		cout << endl;

		cout << "\tOutput Connected to Index: ";
		if (g.output == -2) {
			cout << "OUTPUT PIN";
		} else {
			cout << g.output;
		}
		cout << endl;

		cout << "\tValue: X" << endl;
		cout << endl; // blank line between entries
		//YOU: print "\tInput Connected to Index: ..."
		//     (format differs for INPUT / NOT / two-input gates)

		//YOU: print "\tOutput Connected to Index: ..."
		//     (special case: -2 sentinel means "OUTPUT PIN")

		//YOU: print "\tValue: X"
		//     (blank line between entries)
	}
}

//====================================================
// Prints the truth table: every combination of inputs,
// counting DOWN from all-1s to all-0s (per the spec).
//====================================================
void print_truth_table() {
	//YOU: print header row, e.g. "0|1|2|O\n" for n=3
	cout << "Input Pins (Numbers), Output Pin (O):" << endl;
	for (int i = 0; i < n; i++) cout << i << "|";
	cout << "O" << endl;
	for (int combo = (1 << n) - 1; combo >= 0; combo--) {
		//YOU: print each input bit of 'combo', separated by '|'
		for (int i = 0; i < n; i++) {
			cout << ((combo >> (n - 1 - i)) & 1) << "|";
		}
		cout << evaluate_circuit(combo) << endl;
		//YOU: call evaluate_circuit(combo) and print the result,
		//     then a newline
	}
}

//====================================================
// main
//====================================================
int main() {
	cout << "Welcome to the Gates of Babylon!\n";

	build_input_pins();
	build_gates();

	cout << "\n1) Print Circuit Block or 2) Print Truth Table\n";
	int choice;
	cin >> choice;

	if (choice == 1) {
		print_circuit();
	} else if (choice == 2) {
		print_truth_table();
	} else {
		die();
	}

	return 0;
}

