package edu.umass.ckc.wo.lc;

import edu.umass.ckc.wo.db.DbUtil;
import edu.umass.ckc.wo.tutor.Pedagogy;
import edu.umass.ckc.wo.xml.JDOMUtils;
import org.jdom.Document;
import org.jdom.Element;
import org.jdom.JDOMException;

import javax.servlet.ServletContext;
import java.io.*;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;

/**
 * An XML parser for reading in a ruleset from an XML stream.
 * User: david
 * Date: 4/8/16
 * Time: 1:01 PM
 * To change this template use File | Settings | File Templates.
 */
public class XMLLCRule {

    private static Connection conn;

    public static void loadRuleSetIntoPedagogy(Connection conn, Pedagogy ped, LCRuleset rs, InputStream inputStream) throws JDOMException, IOException {
        XMLLCRule.conn = conn;
        String filename = rs.getSource(); // a file in the resources directory. e.g. lc_curProblem.xml
        Document d = JDOMUtils.makeDocument(inputStream);
        Element ruleset = d.getRootElement();
        String rsName = ruleset.getAttributeValue("name");
        String descr = ruleset.getAttributeValue("description");
        String notes = ruleset.getAttributeValue("notes");
        rs.setName(rsName);
        rs.setDescription(descr);
        rs.setNotes(notes);
        List<Element> metaRules = ruleset.getChildren("meta_rule");
        for (Element mr: metaRules) {
            LCMetaRule r = parseMetaRule(mr);
            rs.addMetaRule(r);
        }

        List<Element> rules= ruleset.getChildren("lc_r");
        for (Element rule: rules) {
            LCRule r = parseRule(rule);
            rs.addRule(r);
        }

    }

    private static LCMetaRule parseMetaRule(Element mr) {
        String n = mr.getAttributeValue("name");
        String v = mr.getAttributeValue("value");
        String u = mr.getAttributeValue("units");
        LCMetaRule r = new LCMetaRule(n,u,v);
        return r;
    }

    public static LCRule parseRule (Element ruleElt) {
        String name,priority,onEvent,descr;
        name = ruleElt.getAttributeValue("name");
        try {
            priority = ruleElt.getAttributeValue("priority");
            onEvent = ruleElt.getAttributeValue("onEvent");
            descr = ruleElt.getAttributeValue("description");
            List<Element> conditions = ruleElt.getChildren("lc_c");
            Element action = ruleElt.getChild("lc_a");
            LCRule rule = new LCRule(-1,name,descr,onEvent,Double.parseDouble(priority));
            for (Element cond: conditions) {
                LCCondition condition = parseCondition(cond);
                rule.addCondition(condition);
            }
            LCAction a = parseAction(action);
            rule.setAction(a);
            return rule;
        } catch (Exception e) {
            System.out.println("Failed to parse rule " + name);
            e.printStackTrace();
        }
        return null;
    }

    private static LCAction parseAction(Element actElt) throws SQLException {
        String media, text;
        String actionType = actElt.getAttributeValue("actionType");
        String msgId = actElt.getAttributeValue("messageId");
        int msgIdi = -1;
        // if an lcmessageId is given, then we need to fetch the text and media file from the lcmessage table
        if (msgId != null && !msgId.equals(""))  {
            msgIdi = Integer.parseInt(msgId);
            LCMessage lcm = DbLCRule.getLCMessage(conn, msgIdi);
            text = lcm.getText();
            media = lcm.getMedia();
        }
        else {
            text = actElt.getTextTrim();
            media = actElt.getAttributeValue("media");
        }
        return new LCAction(-1,text,media, actionType,msgIdi);
    }

    private static LCCondition parseCondition(Element condElt) {
        String fname,relop,val,type,not;
        fname = condElt.getAttributeValue("fnname");
        relop = condElt.getAttributeValue("relop");
        val = condElt.getAttributeValue("val");
        type = condElt.getAttributeValue("type");
        if (type == null)
            type = "boolean";
        not = condElt.getAttributeValue("not"); // if anything is in the not attribute, it will negate the condition
        return new LCCondition(-1,fname,relop,val,type,not != null);
    }

    public static void main(String[] args) {
        File f = new File("F:\\dev\\mathspring\\woServer\\resources\\lc_curProblem.xml");
        FileInputStream str = null;
        try {
            str = new FileInputStream(f);
            LCRuleset rs = new LCRuleset();
            Connection conn= DbUtil.getAConnection("localhost");
            XMLLCRule.loadRuleSetIntoPedagogy(conn, null, rs, str);
//            XMLLCRule.loadRulesIntoPedagogy(conn, null, rs, str);
            DbLCRule.clearRuleTables(conn); // blow away all the contents of rule tables and reset the id counters
           DbLCRule.writeRuleset(conn,rs);
        } catch (FileNotFoundException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        } catch (SQLException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        } catch (JDOMException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        } catch (IOException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        }

    }


}