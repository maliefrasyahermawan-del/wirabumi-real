import 'package:flutter/material.dart';

void main() => runApp(const BumiraApp());

// Palet BUMIRA: terang, hangat, dan tetap mudah dibaca di layar ponsel.
const _brandYellow = Color(0xFFFFD51E);
const _softYellow = Color(0xFFFFE45C);
const _gold = Color(0xFFF5C400);
const _cream = Color(0xFFFFF1CF);
const _warmWhite = Color(0xFFFAFAF7);
const _divider = Color(0xFFEDEBE5);
const _ink = Color(0xFF252525);
const _muted = Color(0xFF8A8A8A);
const _error = Color(0xFFFF6F76);

class TransactionItem {
  TransactionItem({
    required this.name,
    required this.amount,
    required this.date,
    required this.source,
  });

  final String name;
  final int amount;
  final DateTime date;
  final String source;
}

class BumiraApp extends StatefulWidget {
  const BumiraApp({super.key});

  @override
  State<BumiraApp> createState() => _BumiraAppState();
}

class _BumiraAppState extends State<BumiraApp> {
  int _tab = 0;
  final List<TransactionItem> _transactions = [
    TransactionItem(
        name: 'Batik motif Sekar',
        amount: 480000,
        date: DateTime.now(),
        source: 'Manual'),
    TransactionItem(
        name: 'Kemeja linen',
        amount: 275000,
        date: DateTime.now().subtract(const Duration(days: 1)),
        source: 'Scan struk'),
    TransactionItem(
        name: 'Tas anyam',
        amount: 190000,
        date: DateTime.now().subtract(const Duration(days: 2)),
        source: 'Tempel chat'),
  ];

  int get _revenue => _transactions.fold(0, (sum, item) => sum + item.amount);

  void _addTransaction(TransactionItem item) {
    setState(() {
      _transactions.insert(0, item);
      _tab = 1;
    });
  }

  void _openAdd() => setState(() => _tab = 2);

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomePage(
          revenue: _revenue,
          transactionCount: _transactions.length,
          onAdd: _openAdd,
          onInsight: () => setState(() => _tab = 3)),
      LedgerPage(items: _transactions, onAdd: _openAdd),
      AddTransactionPage(onSave: _addTransaction),
      InsightPage(
          revenue: _revenue,
          transactionCount: _transactions.length,
          onAdd: _openAdd),
      MiraPage(revenue: _revenue, transactionCount: _transactions.length),
    ];

    return MaterialApp(
      title: 'BUMIRA',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: const ColorScheme.light(
          primary: _brandYellow,
          onPrimary: _ink,
          secondary: _softYellow,
          onSecondary: _ink,
          surface: _warmWhite,
          onSurface: _ink,
          error: _error,
          onError: Colors.white,
        ),
        scaffoldBackgroundColor: Colors.white,
        appBarTheme: const AppBarTheme(
            backgroundColor: Colors.white, foregroundColor: _ink, elevation: 0),
        cardTheme: CardThemeData(
          color: _warmWhite,
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: _divider),
          ),
        ),
        navigationBarTheme: const NavigationBarThemeData(
          backgroundColor: Colors.white,
          indicatorColor: _cream,
          surfaceTintColor: Colors.white,
          labelTextStyle: WidgetStatePropertyAll(
            TextStyle(fontWeight: FontWeight.w700, color: _ink),
          ),
          iconTheme: WidgetStatePropertyAll(IconThemeData(color: _ink)),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: _warmWhite,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: _divider),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: _divider),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: _gold, width: 2),
          ),
        ),
        fontFamily: 'Roboto',
      ),
      home: Scaffold(
        appBar: _tab == 2
            ? AppBar(
                title: const Text('Catat transaksi',
                    style: TextStyle(fontWeight: FontWeight.w800)))
            : null,
        body: SafeArea(top: _tab != 2, child: pages[_tab]),
        bottomNavigationBar: NavigationBar(
          height: 72,
          selectedIndex: _tab,
          onDestinationSelected: (index) => setState(() => _tab = index),
          destinations: const [
            NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home_rounded),
                label: 'Beranda'),
            NavigationDestination(
                icon: Icon(Icons.receipt_long_outlined),
                selectedIcon: Icon(Icons.receipt_long),
                label: 'Catat'),
            NavigationDestination(
                icon: Icon(Icons.add_circle_outline),
                selectedIcon: Icon(Icons.add_circle),
                label: 'Tambah'),
            NavigationDestination(
                icon: Icon(Icons.insights_outlined),
                selectedIcon: Icon(Icons.insights),
                label: 'Insight'),
            NavigationDestination(
                icon: Icon(Icons.auto_awesome_outlined),
                selectedIcon: Icon(Icons.auto_awesome),
                label: 'Mira'),
          ],
        ),
      ),
    );
  }
}

class MobileHeader extends StatelessWidget {
  const MobileHeader({super.key, required this.greeting});
  final String greeting;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 10),
        child: Row(children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
                color: _brandYellow, borderRadius: BorderRadius.circular(13)),
            child: const Text('B',
                style: TextStyle(
                    color: _ink, fontSize: 21, fontWeight: FontWeight.w900)),
          ),
          const SizedBox(width: 10),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                const Text('BUMIRA',
                    style: TextStyle(
                        letterSpacing: 1.5,
                        fontWeight: FontWeight.w900,
                        color: _ink)),
                Text(greeting,
                    style: const TextStyle(fontSize: 12, color: _muted)),
              ])),
          IconButton(
              onPressed: () {},
              icon: const Icon(Icons.notifications_none_rounded)),
        ]),
      );
}

class HomePage extends StatelessWidget {
  const HomePage(
      {super.key,
      required this.revenue,
      required this.transactionCount,
      required this.onAdd,
      required this.onInsight});
  final int revenue;
  final int transactionCount;
  final VoidCallback onAdd;
  final VoidCallback onInsight;

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.only(bottom: 20),
        children: [
          const MobileHeader(greeting: 'Kenali usahamu, tentukan arah.'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text('Halo, pemilik usaha 👋',
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w900, color: _ink)),
          ),
          const SizedBox(height: 6),
          const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Text('Ringkasan hari ini dari pembukuan BUMIRA.',
                  style: TextStyle(color: _muted))),
          const SizedBox(height: 18),
          SizedBox(
            height: 132,
            child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  MetricCard(
                      label: 'OMZET BULAN INI',
                      value: formatRupiah(revenue),
                      note: '$transactionCount transaksi',
                      accent: _brandYellow),
                  const SizedBox(width: 12),
                  const MetricCard(
                      label: 'LABA BERSIH',
                      value: 'Rp 635.000',
                      note: 'Naik 12% dari bulan lalu',
                      accent: _gold),
                  const SizedBox(width: 12),
                  const MetricCard(
                      label: 'SKOR KESIAPAN',
                      value: '72 / 100',
                      note: 'Naik 5 poin minggu ini',
                      accent: _ink),
                ]),
          ),
          const SizedBox(height: 18),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: FilledButton.icon(
                onPressed: onAdd,
                icon: const Icon(Icons.add),
                label: const Text('Catat transaksi sekarang'),
                style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(54),
                    backgroundColor: _brandYellow,
                    foregroundColor: _ink,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)))),
          ),
          const SizedBox(height: 20),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Card(
              elevation: 0,
              color: _cream,
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: onInsight,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Row(children: [
                    Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                            color: _brandYellow,
                            borderRadius: BorderRadius.circular(15)),
                        child: const Icon(Icons.insights_rounded, color: _ink)),
                    const SizedBox(width: 13),
                    const Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          Text('Arah usaha minggu ini',
                              style: TextStyle(
                                  fontWeight: FontWeight.w900, color: _ink)),
                          SizedBox(height: 3),
                          Text('Lengkapi NIB untuk menaikkan skor kesiapanmu.',
                              style: TextStyle(fontSize: 13, color: _ink)),
                        ])),
                    const Icon(Icons.chevron_right_rounded),
                  ]),
                ),
              ),
            ),
          ),
          const SectionTitle(title: 'Langkah paling berdampak'),
          const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: ActionCard(
                  icon: Icons.verified_user_outlined,
                  title: 'Lengkapi legalitas usaha',
                  subtitle: 'NIB dapat menambah 10 poin kesiapan.',
                  action: 'Mulai')),
          const SizedBox(height: 10),
          const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: ActionCard(
                  icon: Icons.calendar_month_outlined,
                  title: 'Catat transaksi selama 7 hari',
                  subtitle: 'Konsistensi membuat insight makin akurat.',
                  action: 'Lihat')),
        ],
      );
}

class LedgerPage extends StatelessWidget {
  const LedgerPage({super.key, required this.items, required this.onAdd});
  final List<TransactionItem> items;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.fromLTRB(20, 20, 20, 20), children: [
        Row(children: [
          Expanded(
              child: Text('Pembukuan',
                  style: Theme.of(context)
                      .textTheme
                      .headlineSmall
                      ?.copyWith(fontWeight: FontWeight.w900))),
          IconButton(
              onPressed: onAdd,
              icon: const Icon(Icons.add_circle, color: _gold, size: 30))
        ]),
        const Text('Semua transaksi yang menjadi dasar insight BUMIRA.',
            style: TextStyle(color: _muted)),
        const SizedBox(height: 18),
        ...items.map((item) => Card(
              elevation: 0,
              child: ListTile(
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                leading: CircleAvatar(
                    backgroundColor: _cream,
                    child: Icon(
                        item.source == 'Scan struk'
                            ? Icons.document_scanner_outlined
                            : Icons.shopping_bag_outlined,
                        color: _ink)),
                title: Text(item.name,
                    style: const TextStyle(fontWeight: FontWeight.w800)),
                subtitle: Text('${formatDate(item.date)} · ${item.source}'),
                trailing: Text(formatRupiah(item.amount),
                    style: const TextStyle(
                        fontWeight: FontWeight.w900, color: _ink)),
              ),
            )),
      ]);
}

class AddTransactionPage extends StatefulWidget {
  const AddTransactionPage({super.key, required this.onSave});
  final ValueChanged<TransactionItem> onSave;

  @override
  State<AddTransactionPage> createState() => _AddTransactionPageState();
}

class _AddTransactionPageState extends State<AddTransactionPage> {
  int _mode = 0;
  final _name = TextEditingController();
  final _amount = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _amount.dispose();
    super.dispose();
  }

  void _save() {
    final amount = int.tryParse(_amount.text.replaceAll(RegExp(r'[^0-9]'), ''));
    if (_name.text.trim().isEmpty || amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Isi nama produk dan nominal transaksi.')));
      return;
    }
    widget.onSave(TransactionItem(
        name: _name.text.trim(),
        amount: amount,
        date: DateTime.now(),
        source: _mode == 0
            ? 'Manual'
            : _mode == 1
                ? 'Tempel chat'
                : 'Scan struk'));
    _name.clear();
    _amount.clear();
    ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Transaksi tersimpan ke pembukuan.')));
  }

  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.all(20), children: [
        const Text('Pilih cara mencatat',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
        const SizedBox(height: 12),
        SegmentedButton<int>(segments: const [
          ButtonSegment(
              value: 0, label: Text('Manual'), icon: Icon(Icons.edit_outlined)),
          ButtonSegment(
              value: 1,
              label: Text('Chat'),
              icon: Icon(Icons.chat_bubble_outline)),
          ButtonSegment(
              value: 2,
              label: Text('Struk'),
              icon: Icon(Icons.document_scanner_outlined))
        ], selected: {
          _mode
        }, onSelectionChanged: (value) => setState(() => _mode = value.first)),
        const SizedBox(height: 20),
        if (_mode == 2)
          const Card(
              color: _cream,
              elevation: 0,
              child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Row(children: [
                    Icon(Icons.camera_alt_outlined, color: _ink),
                    SizedBox(width: 10),
                    Expanded(
                        child: Text(
                            'OCR kamera akan dihubungkan pada tahap integrasi ML Kit. Untuk prototipe, masukkan hasil bacaan secara manual.'))
                  ]))),
        if (_mode == 1)
          const Card(
              color: _cream,
              elevation: 0,
              child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                      'Tempel chat penjualan untuk diparsing. Pada versi awal, konfirmasi nama produk dan nominalnya di bawah.'))),
        const SizedBox(height: 16),
        TextField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
                labelText: 'Produk atau keterangan',
                hintText: 'Contoh: Batik motif Sekar',
                border: OutlineInputBorder())),
        const SizedBox(height: 14),
        TextField(
            controller: _amount,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
                labelText: 'Total transaksi',
                prefixText: 'Rp ',
                hintText: '480000',
                border: OutlineInputBorder())),
        const SizedBox(height: 20),
        FilledButton(
            onPressed: _save,
            style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(54),
                backgroundColor: _brandYellow,
                foregroundColor: _ink,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16))),
            child: const Text('Simpan transaksi')),
      ]);
}

class InsightPage extends StatelessWidget {
  const InsightPage(
      {super.key,
      required this.revenue,
      required this.transactionCount,
      required this.onAdd});
  final int revenue;
  final int transactionCount;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.fromLTRB(20, 22, 20, 20), children: [
        Text('Insight usaha',
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.w900)),
        const SizedBox(height: 5),
        const Text('Dibentuk dari data yang kamu catat.',
            style: TextStyle(color: _muted)),
        const SizedBox(height: 22),
        Center(
            child: SizedBox(
                width: 176,
                height: 176,
                child: Stack(alignment: Alignment.center, children: [
                  CircularProgressIndicator(
                      value: .72,
                      strokeWidth: 15,
                      backgroundColor: _cream,
                      color: _brandYellow),
                  const Column(mainAxisSize: MainAxisSize.min, children: [
                    Text('72',
                        style: TextStyle(
                            fontSize: 48,
                            fontWeight: FontWeight.w900,
                            color: _ink)),
                    Text('SKOR KESIAPAN',
                        style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 10,
                            letterSpacing: .6))
                  ])
                ]))),
        const SizedBox(height: 22),
        const Text('Usahamu berada di jalur berkembang',
            textAlign: TextAlign.center,
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 19)),
        const SizedBox(height: 6),
        Text(
            '$transactionCount transaksi tercatat dengan omzet ${formatRupiah(revenue)}. Tambahkan legalitas dan pertahankan catatan harian untuk menaikkan skor.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: _muted, height: 1.5)),
        const SectionTitle(title: 'Apa yang membentuk skor'),
        const FactorTile(
            label: 'Konsistensi transaksi', value: 82, color: _brandYellow),
        const FactorTile(label: 'Volume usaha', value: 71, color: _gold),
        const FactorTile(label: 'Pelanggan tetap', value: 66, color: _ink),
        const FactorTile(label: 'Legalitas usaha', value: 40, color: _error),
        const SizedBox(height: 18),
        OutlinedButton.icon(
            onPressed: onAdd,
            icon: const Icon(Icons.add),
            label: const Text('Catat transaksi untuk memperbarui insight')),
      ]);
}

class MiraPage extends StatefulWidget {
  const MiraPage(
      {super.key, required this.revenue, required this.transactionCount});
  final int revenue;
  final int transactionCount;
  @override
  State<MiraPage> createState() => _MiraPageState();
}

class _MiraPageState extends State<MiraPage> {
  final _input = TextEditingController();
  final List<_Chat> _messages = [
    _Chat(false,
        'Halo, aku Mira. Aku bisa membantu membaca kondisi usahamu dari data BUMIRA. Kamu mau bahas omzet, skor kesiapan, atau langkah berikutnya?')
  ];

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _ask([String? value]) {
    final question = (value ?? _input.text).trim();
    if (question.isEmpty) return;
    setState(() {
      _messages.add(_Chat(true, question));
      _messages.add(_Chat(false,
          'Dari ${widget.transactionCount} transaksi yang tercatat, omzetmu saat ini ${formatRupiah(widget.revenue)}. Prioritas terbaikmu adalah menjaga pencatatan harian dan melengkapi legalitas usaha agar skor kesiapan naik.'));
      _input.clear();
    });
  }

  @override
  Widget build(BuildContext context) => Column(
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 12),
            child: Row(children: [
              CircleAvatar(
                  backgroundColor: _brandYellow,
                  child: Icon(Icons.auto_awesome, color: _ink)),
              SizedBox(width: 10),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Mira',
                    style:
                        TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
                Text('Asisten usaha BUMIRA',
                    style: TextStyle(fontSize: 12, color: _muted)),
              ]),
            ]),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                return Align(
                  alignment: message.mine
                      ? Alignment.centerRight
                      : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(13),
                    constraints: const BoxConstraints(maxWidth: 300),
                    decoration: BoxDecoration(
                        color: message.mine ? _brandYellow : _warmWhite,
                        borderRadius: BorderRadius.circular(16)),
                    child: Text(message.text,
                        style: TextStyle(color: _ink, height: 1.4)),
                  ),
                );
              },
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
                children: [
              'Bagaimana omzetku?',
              'Cara naikkan skor?',
              'Apa langkah berikutnya?'
            ]
                    .map((text) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ActionChip(
                            label: Text(text), onPressed: () => _ask(text))))
                    .toList()),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
            child: Row(children: [
              Expanded(
                  child: TextField(
                      controller: _input,
                      onSubmitted: (_) => _ask(),
                      decoration: const InputDecoration(
                          hintText: 'Tanya Mira…',
                          filled: true,
                          fillColor: _warmWhite,
                          border: OutlineInputBorder(
                              borderRadius:
                                  BorderRadius.all(Radius.circular(16)),
                              borderSide: BorderSide.none)))),
              const SizedBox(width: 8),
              IconButton.filled(
                  onPressed: _ask,
                  style: IconButton.styleFrom(backgroundColor: _brandYellow),
                  icon: const Icon(Icons.arrow_upward, color: _ink)),
            ]),
          ),
        ],
      );
}

class MetricCard extends StatelessWidget {
  const MetricCard(
      {super.key,
      required this.label,
      required this.value,
      required this.note,
      required this.accent});
  final String label, value, note;
  final Color accent;
  @override
  Widget build(BuildContext context) => SizedBox(
      width: 220,
      child: Card(
          elevation: 0,
          child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label,
                        style: const TextStyle(
                            fontSize: 10,
                            letterSpacing: .6,
                            fontWeight: FontWeight.w900,
                            color: _muted)),
                    const Spacer(),
                    Text(value,
                        style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: accent)),
                    const SizedBox(height: 4),
                    Text(note,
                        style: const TextStyle(fontSize: 10, color: _muted))
                  ]))));
}

class SectionTitle extends StatelessWidget {
  const SectionTitle({super.key, required this.title});
  final String title;
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 25, 20, 12),
      child: Text(title,
          style: const TextStyle(
              fontSize: 16, fontWeight: FontWeight.w900, color: _ink)));
}

class ActionCard extends StatelessWidget {
  const ActionCard(
      {super.key,
      required this.icon,
      required this.title,
      required this.subtitle,
      required this.action});
  final IconData icon;
  final String title, subtitle, action;
  @override
  Widget build(BuildContext context) => Card(
      elevation: 0,
      child: ListTile(
          leading: CircleAvatar(
              backgroundColor: _cream, child: Icon(icon, color: _ink)),
          title:
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
          subtitle: Text(subtitle),
          trailing: Text(action,
              style:
                  const TextStyle(color: _ink, fontWeight: FontWeight.w800))));
}

class FactorTile extends StatelessWidget {
  const FactorTile(
      {super.key,
      required this.label,
      required this.value,
      required this.color});
  final String label;
  final int value;
  final Color color;
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
          elevation: 0,
          child: Padding(
              padding: const EdgeInsets.all(15),
              child: Column(children: [
                Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(label,
                          style: const TextStyle(fontWeight: FontWeight.w800)),
                      Text('$value',
                          style: TextStyle(
                              fontWeight: FontWeight.w900, color: color))
                    ]),
                const SizedBox(height: 10),
                LinearProgressIndicator(
                    value: value / 100,
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(8),
                    color: color,
                    backgroundColor: _cream)
              ]))));
}

class _Chat {
  _Chat(this.mine, this.text);
  final bool mine;
  final String text;
}

String formatRupiah(int amount) {
  final digits = amount.toString();
  final reversed = digits.split('').reversed.toList();
  final chunks = <String>[];
  for (var i = 0; i < reversed.length; i += 3) {
    chunks.add(reversed.skip(i).take(3).toList().reversed.join());
  }
  return 'Rp ${chunks.reversed.join('.')}';
}

String formatDate(DateTime date) =>
    '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
