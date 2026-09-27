import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("build_data", Path(__file__).parents[1] / "scripts/build_data.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CorpusParsing(unittest.TestCase):
    def test_separates_adjacent_headers_and_missing_titles(self):
        source = "目录 卷001作者\n卷1_1 【春题】作者\n春风又来。\n卷1_2 \n秋水无声。\n卷1_3 【空篇】作者p; 卷1_4 【月】作者\n月明江上。"
        poems = module.parse_corpus(source)
        self.assertEqual([p['id'] for p in poems], ['1_1', '1_2', '1_4'])
        self.assertEqual(poems[1]['title'], '原文未题')
        self.assertEqual(poems[0]['body'], '春风又来。')
        self.assertEqual(poems[2]['author'], '作者')

    def test_removes_structural_lines_and_parenthetical_notes(self):
        source = "卷1_1 【题春】作者\n春来（春注）。\n-----\n卷二\n<END>"
        poems = module.parse_corpus(source)
        self.assertEqual(poems[0]['body'], '春来。')


if __name__ == '__main__':
    unittest.main()
